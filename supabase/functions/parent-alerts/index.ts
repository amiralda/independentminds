import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the calling user from the auth header
    const authHeader = req.headers.get("authorization");
    let callingUserId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      callingUserId = user?.id || null;
    }

    const body = await req.json().catch(() => ({}));
    const alertType = body.type;
    const studentId = body.student_id || "CHRIS";

    // Resolve Telegram credentials: per-parent first, then fallback to env
    let telegramToken = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
    let telegramChatId = Deno.env.get("TELEGRAM_CHAT_ID")!;

    if (callingUserId) {
      const { data: parentSettings } = await supabase
        .from("parent_settings")
        .select("telegram_bot_token, telegram_chat_id")
        .eq("user_id", callingUserId)
        .single();

      if (parentSettings?.telegram_bot_token && parentSettings?.telegram_chat_id) {
        telegramToken = parentSettings.telegram_bot_token;
        telegramChatId = parentSettings.telegram_chat_id;
      }
    }

    const { data: student } = await supabase
      .from("students")
      .select("*")
      .eq("student_id", studentId)
      .single();

    const studentName = student?.display_name || studentId;

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
      });

      return { ok: res.ok, data };
    };

    let result;

    if (alertType === "badge_earned") {
      const badgeName = body.badge_name || "20-Lesson Legend";
      const dateStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
      result = await sendTelegram(`🚀 <b>${studentName} Hit Today's Goal!</b>\n\n🏆 Badge Earned: <b>${badgeName}</b>\n📅 Date: ${dateStr}\n\n💪 Keep up the momentum!\n\n— <i>Independent Minds EDU v2.0</i>`);
    }
    else if (alertType === "help_needed") {
      const comment = body.comment || "No comment provided";
      const subject = body.focus || "Unknown";
      const mood = body.mood || "Unknown";
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
      const badgeList = badges?.map(b => `🏆 ${b.name}`).join("\n") || "No new badges this week";

      result = await sendTelegram(`📊 <b>WEEKLY PROGRESS REPORT</b>\n👤 ${studentName} | ${monStr} to ${todayStr}\n\n📈 Completed: <b>${done.length} / ${total}</b>\n📊 Rate: <b>${total > 0 ? Math.round((done.length / total) * 100) : 0}%</b>\n\n🏅 <b>New Badges:</b>\n${badgeList}\n\n— <i>Independent Minds EDU v2.0</i>`);
    }
    else if (alertType === "test_connection") {
      result = await sendTelegram(`🛠️ <b>Independent Minds EDU: System Test</b>\n\nConnection successful. ✅\n<b>Status:</b> Ready 🚀\n\n— <i>Independent Minds EDU v2.0</i>`);
    }
    else if (alertType === "track_completed") {
      const trackName = body.track_name || "Unknown Track";
      const doneToday = body.done_today || 1;
      const target = body.target || 1;
      const unitType = body.unit_type || "lessons";
      const isGoalMet = doneToday >= target;
      result = await sendTelegram(`${isGoalMet ? "🎯" : "📝"} <b>Activity Update</b>\n\n👤 Student: ${studentName}\n📚 Track: <b>${trackName}</b>\n✅ Completed: <b>${doneToday}/${target} ${unitType}</b>\n\n${isGoalMet ? `🏆 <b>Daily goal reached!</b> 🎉` : `Progress update: ${doneToday} of ${target} ${unitType} completed.`}\n\n— <i>Independent Minds EDU v2.0</i>`);
    }
    else {
      return new Response(JSON.stringify({ error: "Unknown alert type" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
