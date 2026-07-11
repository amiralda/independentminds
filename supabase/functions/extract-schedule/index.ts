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

    const { fileName, fileType, content, isBase64, grade } = await req.json();

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

    const prompt = `You are a schedule data extractor. Extract schedule/timetable information from the following document content.

The student is in Grade ${grade || 7}. 

Return a JSON object with a "schedule" array. Each item must have:
- "subject": string (subject name)
- "start_time": string (HH:MM format, 24-hour)
- "end_time": string (HH:MM format, 24-hour)
- "notes": string (unknown additional info like teacher name, room, platform link)

If the content is base64-encoded binary (PDF/image), describe what you can interpret from the text.
If it's CSV/text, parse the rows directly.

If you cannot extract unknown schedule data, return {"schedule": []}.

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
        model: "google/gemini-2.5-flash",
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
