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

    const now = new Date();
    const today = new Date(now.toLocaleString("en-US", { timeZone: "America/Port-au-Prince" })).toISOString().split("T")[0];

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

    const { data: blocks } = await supabase
      .from("daily_plan")
      .select("*")
      .eq("student_id", "CHRIS")
      .eq("plan_date", today)
      .order("block_order");

    const { data: checkIns } = await supabase
      .from("check_ins")
      .select("*")
      .eq("student_id", "CHRIS")
      .order("timestamp", { ascending: false })
      .limit(1);

    const doneBlocks = blocks?.filter(b => b.status === "Done") || [];
    const missedBlocks = blocks?.filter(b => b.status !== "Done") || [];
    const latestCheckIn = checkIns?.[0];

    const doneList = doneBlocks.map(b => b.subject).join(", ") || "None";
    const missedList = missedBlocks.map(b => b.subject).join(", ") || "None";
    const focus = latestCheckIn?.focus || "N/A";
    const mood = latestCheckIn?.mood || "N/A";

    let recommendation = "Keep up the great work!";
    const langArts = blocks?.filter(b => b.subject === "Language Arts" && b.status !== "Done");
    if (langArts && langArts.length > 0) {
      recommendation = "Focus on Language Arts practice. Read 15 minutes before bed tonight.";
    } else if (missedBlocks.length > 2) {
      recommendation = "Several blocks were missed. Consider adjusting the schedule or taking shorter breaks.";
    }

    const completionRate = blocks && blocks.length > 0
      ? Math.round((doneBlocks.length / blocks.length) * 100)
      : 0;

    const reportEN = `📊 <b>INDEPENDENT MINDS DAILY REPORT</b> (${today})

✅ Done: ${doneList}
❌ Missed: ${missedList}
📈 Completion: <b>${completionRate}%</b>
😊 Mood: ${mood} | 🎯 Focus: ${focus}
💡 Recommendation: ${recommendation}`;

    const reportHT = `📊 <b>RAPÒ INDEPENDENT MINDS</b> (${today})

✅ Fini: ${doneList}
❌ Pa fini: ${missedList}
📈 Konplete: <b>${completionRate}%</b>
😊 Imè: ${mood} | 🎯 Konsantrasyon: ${focus}
💡 Rekòmandasyon: ${recommendation}`;

    const fullReport = `${reportEN}\n\n${reportHT}\n\n— <i>Independent Minds v1.0</i>`;

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
      type: "DailyReport",
      content: fullReport,
      status: telegramRes.ok ? "Sent" : "Failed",
      provider_message_id: telegramData.result?.message_id?.toString() || null,
    });

    // Mark remaining planned blocks as "Missed"
    if (blocks) {
      const plannedIds = blocks.filter(b => b.status === "Planned" || b.status === "In Progress").map(b => b.id);
      if (plannedIds.length > 0) {
        await supabase
          .from("daily_plan")
          .update({ status: "Missed" })
          .in("id", plannedIds);
      }
    }

    return new Response(JSON.stringify({ success: true, report: fullReport }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
