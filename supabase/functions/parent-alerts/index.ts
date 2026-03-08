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
    const telegramToken = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
    const telegramChatId = Deno.env.get("TELEGRAM_CHAT_ID")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const alertType = body.type;
    const studentId = body.student_id || "CHRIS";

    const { data: student } = await supabase
      .from("students")
      .select("*")
      .eq("student_id", studentId)
      .single();

    if (!student) {
      return new Response(JSON.stringify({ error: "Student not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sendTelegram = async (message: string) => {
      const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: message,
          parse_mode: "HTML",
        }),
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

    // === BADGE EARNED ALERT ===
    if (alertType === "badge_earned") {
      const badgeName = body.badge_name || "20-Lesson Legend";
      const dateStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

      const message = `🚀 <b>Christian Hit Today's Goal!</b>

🏆 Badge Earned: <b>${badgeName}</b>
📅 Date: ${dateStr}

${badgeName === "20-Lesson Legend"
  ? "Christian completed 20+ lessons today! He's on track for his July graduation. 🎓"
  : `Christian just earned the "<b>${badgeName}</b>" badge! Keep up the momentum! 💪`}

— <i>Independent Minds v1.0</i>`;

      result = await sendTelegram(message);
    }

    // === HELP NEEDED ALERT ===
    else if (alertType === "help_needed") {
      const comment = body.comment || "No comment provided";
      const subject = body.focus || "Unknown";
      const mood = body.mood || "Unknown";

      const message = `🚨 <b>URGENT INTERVENTION NEEDED</b>

👤 Student: Christian
📚 Current Focus: <b>${subject}</b>
😟 Mood: <b>${mood}</b>
💬 Comment: "<i>${comment}</i>"

Christian has requested help. Please check in with him as soon as possible.

— <i>Independent Minds Alert System</i>`;

      result = await sendTelegram(message);
    }

    // === WEEKLY SUMMARY ===
    else if (alertType === "weekly_summary") {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
      const monStr = monday.toISOString().split("T")[0];
      const todayStr = now.toISOString().split("T")[0];

      const { data: weekBlocks } = await supabase
        .from("daily_plan")
        .select("*")
        .eq("student_id", studentId)
        .gte("plan_date", monStr)
        .lte("plan_date", todayStr);

      const done = weekBlocks?.filter(b => b.status === "Done") || [];
      const total = weekBlocks?.length || 0;
      const scores = done.filter(b => b.time4learning_score != null).map(b => b.time4learning_score!);
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      const ratings = done.filter(b => b.self_rating != null).map(b => b.self_rating!);
      const avgFocus = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : "N/A";

      const { data: badges } = await supabase
        .from("achievements")
        .select("name, criteria_met_at")
        .eq("student_id", studentId)
        .gte("criteria_met_at", monStr);

      const badgeList = badges?.map(b => `🏆 ${b.name}`).join("\n") || "No new badges this week";

      const daysLeft = Math.ceil((new Date("2026-07-03").getTime() - now.getTime()) / 86400000);

      const message = `📊 <b>WEEKLY PROGRESS REPORT</b>
${monStr} to ${todayStr}

📈 Activities Completed: <b>${done.length} / ${total}</b>
📊 Completion Rate: <b>${total > 0 ? Math.round((done.length / total) * 100) : 0}%</b>
🎯 Average Score: <b>${avgScore}%</b>
🧠 Average Focus: <b>${avgFocus}/5</b>

🏅 <b>New Badges:</b>
${badgeList}

📉 <b>Graduation Burndown:</b>
${daysLeft} days remaining
Target pace: 20 lessons/day

Keep pushing, Christian! 💪🎓

— <i>Independent Minds v1.0</i>`;

      result = await sendTelegram(message);
    }

    else {
      return new Response(JSON.stringify({ error: "Unknown alert type. Use: badge_earned, help_needed, or weekly_summary" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
