import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1. Require authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized: missing token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify JWT using anon client
    const anonClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized: invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callingUserId = user.id;

    // Use service role client for data operations
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const alertType = body.type;
    const studentId = body.student_id || "CHRIS";

    // 2. Verify the student belongs to the calling user OR the caller IS the student
    const { data: student } = await supabase
      .from("students")
      .select("*")
      .eq("student_id", studentId)
      .single();

    // Check if caller is the parent
    const isParent = student && student.parent_id === callingUserId;
    // Check if caller is the student themselves (via profiles)
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("student_id, role")
      .eq("id", callingUserId)
      .single();
    const isStudent = callerProfile?.role === "student" && callerProfile?.student_id === studentId;

    if (!student || (!isParent && !isStudent)) {
      return new Response(JSON.stringify({ error: "Forbidden: not your student" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For parent notifications, resolve the parent's user_id for settings lookup
    const parentUserId = student.parent_id;

    const studentName = escapeHtml(student.display_name || studentId);

    // 3. Resolve Telegram credentials: per-parent first, then fallback to env
    let telegramToken = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
    let telegramChatId = Deno.env.get("TELEGRAM_CHAT_ID")!;

    const { data: parentSettings } = await supabase
      .from("parent_settings")
      .select("telegram_bot_token, telegram_chat_id")
      .eq("user_id", parentUserId)
      .single();

    if (parentSettings?.telegram_bot_token && parentSettings?.telegram_chat_id) {
      telegramToken = parentSettings.telegram_bot_token;
      telegramChatId = parentSettings.telegram_chat_id;
    }

    const sendTelegram = async (message: string) => {
      const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: telegramChatId, text: message, parse_mode: "HTML" }),
      });
      const data = await res.json();

      await supabase.from("messages_log").insert({
        recipient: telegramChatId,
        channel: "Telegram",
        type: alertType || "Alert",
        content: message,
        status: res.ok ? "Sent" : "Failed",
        provider_message_id: data.result?.message_id?.toString() || null,
        user_id: callingUserId,
      });

      return { ok: res.ok, data };
    };

    let result;

    // 4. All user inputs are HTML-escaped
    if (alertType === "badge_earned") {
      const badgeName = escapeHtml(body.badge_name || "20-Lesson Legend");
      const dateStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
      result = await sendTelegram(`🚀 <b>${studentName} Hit Today's Goal!</b>\n\n🏆 Badge Earned: <b>${badgeName}</b>\n📅 Date: ${dateStr}\n\n💪 Keep up the momentum!\n\n— <i>Independent Minds EDU v2.0</i>`);
    }
    else if (alertType === "help_needed") {
      const comment = escapeHtml(body.comment || "No comment provided");
      const subject = escapeHtml(body.focus || "Unknown");
      const mood = escapeHtml(body.mood || "Unknown");
      result = await sendTelegram(`🚨 <b>URGENT INTERVENTION NEEDED</b>\n\n👤 Student: ${studentName}\n📚 Current Focus: <b>${subject}</b>\n😟 Mood: <b>${mood}</b>\n💬 Comment: "<i>${comment}</i>"\n\n${studentName} has requested help.\n\n— <i>Independent Minds EDU Alert System</i>`);
    }
    else if (alertType === "weekly_summary") {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
      const monStr = monday.toISOString().split("T")[0];
      const todayStr = now.toISOString().split("T")[0];

      const { data: weekBlocks } = await supabase.from("daily_plan").select("*").eq("student_id", studentId).gte("plan_date", monStr).lte("plan_date", todayStr);
      const done = weekBlocks?.filter(b => b.status === "Done") || [];
      const total = weekBlocks?.length || 0;

      const { data: badges } = await supabase.from("achievements").select("name, criteria_met_at").eq("student_id", studentId).gte("criteria_met_at", monStr);
      const badgeList = badges?.map(b => `🏆 ${escapeHtml(b.name)}`).join("\n") || "No new badges this week";

      result = await sendTelegram(`📊 <b>WEEKLY PROGRESS REPORT</b>\n👤 ${studentName} | ${monStr} to ${todayStr}\n\n📈 Completed: <b>${done.length} / ${total}</b>\n📊 Rate: <b>${total > 0 ? Math.round((done.length / total) * 100) : 0}%</b>\n\n🏅 <b>New Badges:</b>\n${badgeList}\n\n— <i>Independent Minds EDU v2.0</i>`);
    }
    else if (alertType === "test_connection") {
      result = await sendTelegram(`🛠️ <b>Independent Minds EDU: System Test</b>\n\nConnection successful. ✅\n<b>Status:</b> Ready 🚀\n\n— <i>Independent Minds EDU v2.0</i>`);
    }
    else if (alertType === "track_completed") {
      const trackName = escapeHtml(body.track_name || "Unknown Track");
      const doneToday = Number(body.done_today) || 1;
      const target = Number(body.target) || 1;
      const unitType = escapeHtml(body.unit_type || "lessons");
      const isGoalMet = doneToday >= target;
      result = await sendTelegram(`${isGoalMet ? "🎯" : "📝"} <b>Activity Update</b>\n\n👤 Student: ${studentName}\n📚 Track: <b>${trackName}</b>\n✅ Completed: <b>${doneToday}/${target} ${unitType}</b>\n\n${isGoalMet ? `🏆 <b>Daily goal reached!</b> 🎉` : `Progress update: ${doneToday} of ${target} ${unitType} completed.`}\n\n— <i>Independent Minds EDU v2.0</i>`);
    }
    else if (alertType === "reward_suggestion") {
      const rewardName = escapeHtml(body.reward_name || "a reward");
      const rewardIcon = body.reward_icon || "🎁";
      const rewardPoints = Number(body.reward_points) || 0;
      result = await sendTelegram(`💡 <b>Reward Suggestion from ${studentName}!</b>\n\n${rewardIcon} <b>${rewardName}</b>\n💰 Points: <b>${rewardPoints}</b>\n\n${studentName} would love this as a reward! You can add it in the Rewards Management section of your dashboard.\n\n— <i>Independent Minds EDU v2.0</i>`);
    }
    else {
      return new Response(JSON.stringify({ error: "Unknown alert type" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("parent-alerts error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
