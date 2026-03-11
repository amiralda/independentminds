import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret !== Deno.env.get("CRON_SECRET")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const telegramToken = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
    const telegramChatId = Deno.env.get("TELEGRAM_CHAT_ID")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: student } = await supabase
      .from("students")
      .select("*")
      .eq("student_id", "CHRIS")
      .single();

    if (!student) {
      return new Response(JSON.stringify({ error: "Student not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get this week's blocks (Mon-Sun)
    const now = new Date();
    const haitiNow = new Date(now.toLocaleString("en-US", { timeZone: "America/Port-au-Prince" }));
    const dayOfWeek = haitiNow.getDay();
    const monday = new Date(haitiNow);
    monday.setDate(haitiNow.getDate() - ((dayOfWeek + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const monStr = monday.toISOString().split("T")[0];
    const sunStr = sunday.toISOString().split("T")[0];

    const { data: blocks } = await supabase
      .from("daily_plan")
      .select("status, subject")
      .eq("student_id", "CHRIS")
      .gte("plan_date", monStr)
      .lte("plan_date", sunStr);

    const total = blocks?.length || 0;
    const done = blocks?.filter(b => b.status === "Done").length || 0;
    const rate = total > 0 ? Math.round((done / total) * 100) : 0;

    let badgeEN = "";
    let emoji = "";

    if (rate >= 90) {
      emoji = "🏆";
      badgeEN = "Champion of the Week!";
    } else if (rate >= 75) {
      emoji = "⭐";
      badgeEN = "Gold Star!";
    } else if (rate >= 50) {
      emoji = "💪";
      badgeEN = "Keep Going!";
    } else {
      emoji = "🔄";
      badgeEN = "New Week, New Start!";
    }

    const subjectBreakdown = ["English", "ESL", "Math", "Science", "Social Studies", "Public Speaking", "Media Education"]
      .map(s => {
        const subBlocks = blocks?.filter(b => b.subject === s) || [];
        const subDone = subBlocks.filter(b => b.status === "Done").length;
        return subBlocks.length > 0 ? `  • ${s}: ${subDone}/${subBlocks.length}` : null;
      })
      .filter(Boolean)
      .join("\n");

    const message = `${emoji} <b>WEEKLY BADGE — ${badgeEN}</b>

📊 <b>Weekly Summary for Christian</b>
${monStr} to ${sunStr}

📈 Blocks Completed: <b>${done} / ${total}</b> (${rate}%)
🏅 Badge: ${emoji} ${badgeEN}

📚 <b>Subject Breakdown:</b>
${subjectBreakdown || "No data"}

Keep pushing, Christian! 💪🎓

— <i>Independent Minds v1.0</i>`;

    const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
    const telegramRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: telegramChatId,
        text: message,
        parse_mode: "HTML",
      }),
    });

    const telegramData = await telegramRes.json();

    await supabase.from("messages_log").insert({
      recipient: telegramChatId,
      channel: "Telegram",
      type: "WeeklyBadge",
      content: message,
      status: telegramRes.ok ? "Sent" : "Failed",
      provider_message_id: telegramData.result?.message_id?.toString() || null,
    });

    return new Response(JSON.stringify({ success: true, rate, badge: badgeEN }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error('weekly-badge error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
