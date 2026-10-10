import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Auth: require a real user JWT (not just the anon key) ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Rate limit: 20 requests / hour per user ---
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });
    const windowStart = new Date();
    windowStart.setMinutes(0, 0, 0);
    const { data: rl } = await adminClient.rpc("increment_rate_limit", {
      p_user_id: user.id,
      p_function_name: "extract-schedule",
      p_window_start: windowStart.toISOString(),
      p_limit: 20,
    });
    if (rl && rl.allowed === false) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { fileName, fileType, content, isBase64, grade, startDate } = await req.json();

    if (!content || !fileName) {
      return new Response(JSON.stringify({ error: "Missing content or fileName" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const AI_GATEWAY_API_KEY = Deno.env.get("AI_GATEWAY_API_KEY");
    if (!AI_GATEWAY_API_KEY) {
      throw new Error("AI_GATEWAY_API_KEY not configured");
    }
    const AI_GATEWAY_URL = Deno.env.get("AI_GATEWAY_URL");
    if (!AI_GATEWAY_URL) {
      throw new Error("AI_GATEWAY_URL not configured");
    }

    const today = new Date().toISOString().split("T")[0];
    const anchorDate = typeof startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(startDate)
      ? startDate
      : today;

    const prompt = `You are a schedule data extractor. Extract schedule/timetable information from the following document content.

The student is in Grade ${grade || 7}.
Today's date is ${today}. The schedule should start on ${anchorDate} unless the document clearly states other dates.

Return a JSON object with a "schedule" array. Each item must have:
- "date": string (YYYY-MM-DD). See the date rules below.
- "subject": string (subject name)
- "start_time": string (HH:MM, 24-hour)
- "end_time": string (HH:MM, 24-hour)
- "notes": string (any additional info such as teacher name, room, chapter, platform link; empty string if none)

Date rules, in priority order:
1. If a row has an explicit calendar date in any format (2026-10-05, 10/05/2026, 5 Oct 2026, Oct 5), convert it to YYYY-MM-DD. For an ambiguous numeric date assume MM/DD/YYYY (US format). If the year is missing, use the year of ${anchorDate}.
2. If rows are labelled by weekday only (Monday/Lundi/Lendi, Tue, Mèkredi...), map each weekday to its date in the week that begins on or after ${anchorDate}, and repeat nothing: one date per weekday occurrence.
3. If rows are labelled "Day 1", "Week 2 Day 3", "Jou 4" or similar counters, count forward from ${anchorDate} across calendar days, skipping Sundays.
4. If a row has no usable date information at all, set "date" to "".

Time rules:
- Normalize to 24-hour HH:MM. "8:00" becomes "08:00"; "1:30 PM" becomes "13:30".
- If a row has no times, set both "start_time" and "end_time" to "".

Other rules:
- One array item per distinct task/period. Do not merge two subjects into one item.
- Do not invent subjects, dates or times that are not supported by the document.
- Preserve the document's own order.
- If the content is base64-encoded binary (PDF/image), extract what you can read from it.
- If it is CSV or text, parse the rows directly, whatever the column names or column order.
- If you cannot extract any schedule data, return {"schedule": []}.

File: ${fileName} (${fileType})
Content${isBase64 ? " (base64)" : ""}:
${isBase64 ? content.substring(0, 5000) : content.substring(0, 10000)}`;

    const response = await fetch(`${AI_GATEWAY_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${AI_GATEWAY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        messages: [
          { role: "system", content: "You extract schedule data from documents. Always respond with valid JSON only, no markdown." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI API error [${response.status}]: ${errText}`);
    }

    const aiData = await response.json();
    const text = aiData.choices?.[0]?.message?.content || "{}";
    
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { schedule: [] };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Extract schedule error:", error);
    return new Response(JSON.stringify({ error: error.message, schedule: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
