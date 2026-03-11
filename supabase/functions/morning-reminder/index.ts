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
    const haitiDate = new Date(now.toLocaleString("en-US", { timeZone: "America/Port-au-Prince" }));
    const today = haitiDate.toISOString().split("T")[0];

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
      type: "MorningReminder",
      content: fullMessage,
      status: telegramRes.ok ? "Sent" : "Failed",
      provider_message_id: telegramData.result?.message_id?.toString() || null,
    });

    return new Response(JSON.stringify({ success: true, message_id: telegramData.result?.message_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error('morning-reminder error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
