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

    const now = new Date();
    const haitiHour = parseInt(now.toLocaleString("en-US", { timeZone: "America/Port-au-Prince", hour: "numeric", hour12: false }));

    let timeContext = "midday";
    if (haitiHour < 12) timeContext = "morning";
    else if (haitiHour < 15) timeContext = "afternoon";
    else timeContext = "end of day";

    const today = new Date(now.toLocaleString("en-US", { timeZone: "America/Port-au-Prince" })).toISOString().split("T")[0];

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

    const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
    const telegramRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: telegramChatId, text: fullMessage }),
    });

    const telegramData = await telegramRes.json();

    await supabase.from("messages_log").insert({
      recipient: telegramChatId,
      channel: "Telegram",
      type: "CheckIn",
      content: fullMessage,
      status: telegramRes.ok ? "Sent" : "Failed",
      provider_message_id: telegramData.result?.message_id?.toString() || null,
    });

    return new Response(JSON.stringify({ success: true, message_id: telegramData.result?.message_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
