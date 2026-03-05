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

    // Get this week's blocks (Mon-Sun)
    const now = new Date();
    const haitiNow = new Date(now.toLocaleString("en-US", { timeZone: "America/Port-au-Prince" }));
    const dayOfWeek = haitiNow.getDay();
    const monday = new Date(haitiNow);
    monday.setDate(haitiNow.getDate() - ((dayOfWeek + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const { data: blocks } = await supabase
      .from("daily_plan")
      .select("status, subject")
      .eq("student_id", "CHRIS")
      .gte("plan_date", monday.toISOString().split("T")[0])
      .lte("plan_date", sunday.toISOString().split("T")[0]);

    const total = blocks?.length || 0;
    const done = blocks?.filter(b => b.status === "Done").length || 0;
    const rate = total > 0 ? Math.round((done / total) * 100) : 0;

    let badgeEN = "";
    let badgeHT = "";
    let emoji = "";

    if (rate >= 90) {
      emoji = "🏆";
      badgeEN = "Champion of the Week!";
      badgeHT = "Chanpyon Semèn nan!";
    } else if (rate >= 75) {
      emoji = "⭐";
      badgeEN = "Gold Star!";
      badgeHT = "Zetwal Lò!";
    } else if (rate >= 50) {
      emoji = "💪";
      badgeEN = "Keep Going!";
      badgeHT = "Kontinye!";
    } else {
      emoji = "🔄";
      badgeEN = "New Week, New Start! You can do it!";
      badgeHT = "Nouvo Semèn, Nouvo Kòmansman! Ou kapab!";
    }

    // Message to Chris
    const chrisMessage = `${emoji} WEEKLY BADGE ${emoji}

EN: Congratulations Chris! You completed ${done}/${total} blocks this week (${rate}%). ${badgeEN}

HT: Felisitasyon Chris! Ou fè ${done}/${total} blòk semèn sa a (${rate}%). ${badgeHT}`;

    // Summary to Dad
    const dadMessage = `📊 WEEKLY SUMMARY FOR CHRIS

Blocks: ${done}/${total} completed (${rate}%)
Badge: ${emoji} ${badgeEN}

Subject breakdown:
${["Language Arts", "Math", "Science", "Social Studies", "English Support"]
  .map(s => {
    const subBlocks = blocks?.filter(b => b.subject === s) || [];
    const subDone = subBlocks.filter(b => b.status === "Done").length;
    return `  • ${s}: ${subDone}/${subBlocks.length}`;
  }).join("\n")}`;

    // Send to Chris via WhatsApp
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSID}/Messages.json`;
    const authHeader = btoa(`${twilioSID}:${twilioSecret}`);

    const sendWhatsApp = async (to: string, message: string) => {
      const body = new URLSearchParams({
        From: "whatsapp:+14155238886",
        To: `whatsapp:${to}`,
        Body: message,
      });
      const res = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          Authorization: `Basic ${authHeader}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });
      return res.json();
    };

    const chrisRes = await sendWhatsApp(student.student_whatsapp!, chrisMessage);
    const dadRes = await sendWhatsApp(student.parent_whatsapp!, dadMessage);

    // Log messages
    await supabase.from("messages_log").insert([
      {
        recipient: student.student_whatsapp || "",
        channel: "WhatsApp",
        type: "WeeklyBadge",
        content: chrisMessage,
        status: "Sent",
        provider_message_id: chrisRes.sid || null,
      },
      {
        recipient: student.parent_whatsapp || "",
        channel: "WhatsApp",
        type: "WeeklyBadge",
        content: dadMessage,
        status: "Sent",
        provider_message_id: dadRes.sid || null,
      },
    ]);

    return new Response(JSON.stringify({ success: true, rate, badge: badgeEN }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
