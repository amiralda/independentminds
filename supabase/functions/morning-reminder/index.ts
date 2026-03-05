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

    // Get today's date in Haiti timezone
    const now = new Date();
    const haitiDate = new Date(now.toLocaleString("en-US", { timeZone: "America/Port-au-Prince" }));
    const today = haitiDate.toISOString().split("T")[0];

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

    // Get first block for today
    const { data: firstBlock } = await supabase
      .from("daily_plan")
      .select("*")
      .eq("student_id", "CHRIS")
      .eq("plan_date", today)
      .order("block_order")
      .limit(1)
      .single();

    if (!firstBlock) {
      return new Response(JSON.stringify({ message: "No blocks scheduled today" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subject = firstBlock.subject;
    const messageEN = `Good morning Chris! ☀️ Start with ${subject}. Open Time4Learning and complete your lesson. You have a great day ahead!`;
    const messageHT = `Bonjou Chris! ☀️ Kòmanse ak ${subject}. Louvri Time4Learning epi fè leson ou. Ou gen yon bèl jounen devan ou!`;
    const fullMessage = `${messageEN}\n\n${messageHT}`;

    // Send via Twilio WhatsApp
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSID}/Messages.json`;
    const authHeader = btoa(`${twilioSID}:${twilioSecret}`);

    const body = new URLSearchParams({
      From: "whatsapp:+14155238886",
      To: `whatsapp:${student.student_whatsapp}`,
      Body: fullMessage,
    });

    const twilioRes = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const twilioData = await twilioRes.json();

    // Log to messages_log
    await supabase.from("messages_log").insert({
      recipient: student.student_whatsapp || "",
      channel: "WhatsApp",
      type: "MorningReminder",
      content: fullMessage,
      status: twilioRes.ok ? "Sent" : "Failed",
      provider_message_id: twilioData.sid || null,
    });

    return new Response(JSON.stringify({ success: true, sid: twilioData.sid }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
