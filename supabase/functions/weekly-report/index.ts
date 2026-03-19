import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

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
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate this week's range (Mon–Sun)
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((day + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const monStr = monday.toISOString().split("T")[0];
    const sunStr = sunday.toISOString().split("T")[0];

    // Get all students
    const { data: students } = await supabase.from("students").select("student_id, display_name, parent_id");
    if (!students || students.length === 0) {
      return new Response(JSON.stringify({ message: "No students" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { student: string; sent: boolean }[] = [];

    for (const student of students) {
      try {
        // Get parent Telegram settings
        let telegramToken = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
        let telegramChatId = Deno.env.get("TELEGRAM_CHAT_ID")!;

        if (student.parent_id) {
          const { data: ps } = await supabase
            .from("parent_settings")
            .select("telegram_bot_token, telegram_chat_id")
            .eq("user_id", student.parent_id)
            .single();
          if (ps?.telegram_bot_token && ps?.telegram_chat_id) {
            telegramToken = ps.telegram_bot_token;
            telegramChatId = ps.telegram_chat_id;
          }
        }

        // Blocks this week
        const { data: blocks } = await supabase
          .from("daily_plan")
          .select("plan_date, status, subject, time4learning_score, self_rating")
          .eq("student_id", student.student_id)
          .gte("plan_date", monStr)
          .lte("plan_date", sunStr);

        const allBlocks = blocks || [];
        const done = allBlocks.filter(b => b.status === "Done");
        const total = allBlocks.length;
        const rate = total > 0 ? Math.round((done.length / total) * 100) : 0;

        // Subject breakdown
        const subjectMap: Record<string, number> = {};
        done.forEach(b => { subjectMap[b.subject] = (subjectMap[b.subject] || 0) + 1; });
        const subjectLines = Object.entries(subjectMap)
          .sort((a, b) => b[1] - a[1])
          .map(([s, c]) => `  📚 ${escapeHtml(s)}: <b>${c}</b>`)
          .join("\n");

        // Avg score
        const scores = done.filter(b => b.time4learning_score != null).map(b => b.time4learning_score!);
        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

        // Badges this week
        const { data: badges } = await supabase
          .from("achievements")
          .select("name")
          .eq("student_id", student.student_id)
          .gte("criteria_met_at", monStr + "T00:00:00")
          .lte("criteria_met_at", sunStr + "T23:59:59");
        const badgeList = badges?.map(b => `  🏆 ${escapeHtml(b.name)}`).join("\n") || "  None";

        // Points earned this week
        const { data: points } = await supabase
          .from("reward_points")
          .select("points")
          .eq("student_id", student.student_id)
          .gte("created_at", monStr + "T00:00:00")
          .lte("created_at", sunStr + "T23:59:59");
        const totalPoints = (points || []).reduce((sum, r) => sum + r.points, 0);

        // Check-ins this week
        const { data: checkIns } = await supabase
          .from("check_ins")
          .select("mood, focus")
          .eq("student_id", student.student_id)
          .gte("timestamp", monStr + "T00:00:00")
          .lte("timestamp", sunStr + "T23:59:59");
        const checkInCount = checkIns?.length || 0;

        // Streak: consecutive days with done blocks
        const daysWithDone = new Set(done.map(b => b.plan_date));
        let streak = 0;
        const todayStr = now.toISOString().split("T")[0];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(monday);
          d.setDate(monday.getDate() + i);
          const ds = d.toISOString().split("T")[0];
          if (ds > todayStr) continue;
          if (daysWithDone.has(ds)) streak++;
          else if (streak > 0) break;
        }

        const studentName = escapeHtml(student.display_name || student.student_id);

        const reportEN = `📊 <b>WEEKLY PROGRESS REPORT</b>
👤 ${studentName} | ${monStr} → ${sunStr}

📈 <b>Completion:</b> ${done.length}/${total} (<b>${rate}%</b>)
🔥 <b>Streak:</b> ${streak} day${streak !== 1 ? "s" : ""}
🎯 <b>Check-ins:</b> ${checkInCount}
💰 <b>Points Earned:</b> ${totalPoints}
${avgScore !== null ? `📝 <b>Avg Score:</b> ${avgScore}%` : ""}

📚 <b>Subject Breakdown:</b>
${subjectLines || "  No completed blocks"}

🏅 <b>Badges Earned:</b>
${badgeList}`;

        const reportHT = `📊 <b>RAPÒ CHAK SEMÈN</b>
👤 ${studentName} | ${monStr} → ${sunStr}

📈 <b>Konplete:</b> ${done.length}/${total} (<b>${rate}%</b>)
🔥 <b>Konsekitif:</b> ${streak} jou
🎯 <b>Tcheke:</b> ${checkInCount}
💰 <b>Pwen:</b> ${totalPoints}
${avgScore !== null ? `📝 <b>Mwayèn Nòt:</b> ${avgScore}%` : ""}

📚 <b>Pa Matyè:</b>
${subjectLines || "  Pa gen blòk fini"}

🏅 <b>Badj:</b>
${badgeList}`;

        const fullReport = `${reportEN}\n\n${reportHT}\n\n— <i>Independent Minds EDU v2.0</i>`;

        const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
        const telegramRes = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: telegramChatId, text: fullReport, parse_mode: "HTML" }),
        });

        const telegramData = await telegramRes.json();

        await supabase.from("messages_log").insert({
          recipient: telegramChatId,
          channel: "Telegram",
          type: "WeeklyReport",
          content: fullReport,
          status: telegramRes.ok ? "Sent" : "Failed",
          provider_message_id: telegramData.result?.message_id?.toString() || null,
        });

        results.push({ student: student.student_id, sent: telegramRes.ok });
      } catch (e) {
        console.error(`Error for student ${student.student_id}:`, e);
        results.push({ student: student.student_id, sent: false });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("weekly-report error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
