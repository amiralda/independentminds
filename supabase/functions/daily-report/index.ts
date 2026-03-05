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

    const now = new Date();
    const today = new Date(now.toLocaleString("en-US", { timeZone: "America/Port-au-Prince" })).toISOString().split("T")[0];

    // Get student info
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

    // Get today's blocks
    const { data: blocks } = await supabase
      .from("daily_plan")
      .select("*")
      .eq("student_id", "CHRIS")
      .eq("plan_date", today)
      .order("block_order");

    // Get latest check-in
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

    // Generate recommendation
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

    const reportEN = `📊 LEKÒL FASIL DAILY REPORT (${today})

✅ Done: ${doneList}
❌ Missed: ${missedList}
📈 Completion: ${completionRate}%
😊 Mood: ${mood} | 🎯 Focus: ${focus}
💡 Recommendation: ${recommendation}`;

    const reportHT = `📊 RAPÒ LEKÒL FASIL (${today})

✅ Fini: ${doneList}
❌ Pa fini: ${missedList}
📈 Konplete: ${completionRate}%
😊 Imè: ${mood} | 🎯 Konsantrasyon: ${focus}
💡 Rekòmandasyon: ${recommendation}`;

    const fullReport = `${reportEN}\n\n${reportHT}`;

    // Send WhatsApp to Dad
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSID}/Messages.json`;
    const authHeader = btoa(`${twilioSID}:${twilioSecret}`);

    const whatsappBody = new URLSearchParams({
      From: "whatsapp:+14155238886",
      To: `whatsapp:${student.parent_whatsapp}`,
      Body: fullReport,
    });

    const twilioRes = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: whatsappBody.toString(),
    });

    const twilioData = await twilioRes.json();

    // Log WhatsApp message
    await supabase.from("messages_log").insert({
      recipient: student.parent_whatsapp || "",
      channel: "WhatsApp",
      type: "DailyReport",
      content: fullReport,
      status: twilioRes.ok ? "Sent" : "Failed",
      provider_message_id: twilioData.sid || null,
    });

    // Also mark remaining planned blocks as "Missed" at end of day
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
