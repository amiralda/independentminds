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
    const twilioSID = Deno.env.get("twilioSID")!;
    const twilioSecret = Deno.env.get("twilioSecret")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const alertType = body.type; // "badge_earned" | "help_needed" | "weekly_summary"
    const studentId = body.student_id || "CHRIS";

    // Get student info
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

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSID}/Messages.json`;
    const authHeader = btoa(`${twilioSID}:${twilioSecret}`);

    const sendWhatsApp = async (message: string) => {
      const whatsappBody = new URLSearchParams({
        From: "whatsapp:+14155238886",
        To: `whatsapp:${student.parent_whatsapp}`,
        Body: message,
      });

      const res = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          Authorization: `Basic ${authHeader}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: whatsappBody.toString(),
      });

      const data = await res.json();

      await supabase.from("messages_log").insert({
        recipient: student.parent_whatsapp || student.parent_email || "",
        channel: "WhatsApp",
        type: alertType || "Alert",
        content: message,
        status: res.ok ? "Sent" : "Failed",
        provider_message_id: data.sid || null,
      });

      return { ok: res.ok, data };
    };

    let result;

    // === BADGE EARNED ALERT ===
    if (alertType === "badge_earned") {
      const badgeName = body.badge_name || "20-Lesson Legend";
      const message = `🚀 Christian Hit Today's Goal!

🏆 Badge Earned: ${badgeName}
📅 Date: ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}

${badgeName === "20-Lesson Legend" 
  ? "Christian completed 20+ lessons today! He's on track for his July graduation. 🎓"
  : `Christian just earned the "${badgeName}" badge! Keep up the momentum! 💪`}

— Independent Minds v1.0`;

      result = await sendWhatsApp(message);
    }

    // === HELP NEEDED ALERT ===
    else if (alertType === "help_needed") {
      const comment = body.comment || "No comment provided";
      const subject = body.focus || "Unknown";
      const mood = body.mood || "Unknown";

      const message = `🚨 URGENT INTERVENTION NEEDED

Student: Christian
📚 Current Focus: ${subject}
😟 Mood: ${mood}
💬 Comment: "${comment}"

Christian has requested help. Please check in with him as soon as possible.

— Independent Minds Alert System`;

      result = await sendWhatsApp(message);
    }

    // === WEEKLY SUMMARY ===
    else if (alertType === "weekly_summary") {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
      const monStr = monday.toISOString().split("T")[0];
      const todayStr = now.toISOString().split("T")[0];

      // Get week's blocks
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

      // Get new badges this week
      const { data: badges } = await supabase
        .from("achievements")
        .select("name, criteria_met_at")
        .eq("student_id", studentId)
        .gte("criteria_met_at", monStr);

      const badgeList = badges?.map(b => `🏆 ${b.name}`).join("\n") || "No new badges this week";

      // Burndown tracking
      const totalRemaining = 2039 - done.length; // Simplified
      const daysLeft = Math.ceil((new Date("2026-07-03").getTime() - now.getTime()) / 86400000);

      const message = `📊 WEEKLY PROGRESS REPORT
${monStr} to ${todayStr}

📈 Activities Completed: ${done.length} / ${total}
📊 Completion Rate: ${total > 0 ? Math.round((done.length / total) * 100) : 0}%
🎯 Average Score: ${avgScore}%
🧠 Average Focus: ${avgFocus}/5

🏅 New Badges:
${badgeList}

📉 Graduation Burndown:
${daysLeft} days remaining
Target pace: 20 lessons/day

Keep pushing, Christian! 💪🎓

— Independent Minds v1.0`;

      result = await sendWhatsApp(message);
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
