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

    // Get current Haiti time for contextual message
    const now = new Date();
    const haitiHour = parseInt(now.toLocaleString("en-US", { timeZone: "America/Port-au-Prince", hour: "numeric", hour12: false }));

    let timeContext = "midday";
    if (haitiHour < 12) timeContext = "morning";
    else if (haitiHour < 15) timeContext = "afternoon";
    else timeContext = "end of day";

    const today = new Date(now.toLocaleString("en-US", { timeZone: "America/Port-au-Prince" })).toISOString().split("T")[0];

    // Get today's progress
    const { data: blocks } = await supabase
      .from("daily_plan")
      .select("status")
      .eq("student_id", "CHRIS")
      .eq("plan_date", today);

    const total = blocks?.length || 0;
    const done = blocks?.filter(b => b.status === "Done").length || 0;

    const messageEN = `Hey Chris! 📋 Time for a quick check-in (${timeContext}). You've done ${done}/${total} blocks so far. How are you feeling? Open the app and tell us!`;
    const messageHT = `Ey Chris! 📋 Lè pou yon ti tcheke (${timeContext}). Ou fè ${done}/${total} blòk deja. Kijan ou santi ou? Louvri app la epi di nou!`;
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

    await supabase.from("messages_log").insert({
      recipient: student.student_whatsapp || "",
      channel: "WhatsApp",
      type: "CheckIn",
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
