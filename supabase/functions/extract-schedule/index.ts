import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileName, fileType, content, isBase64, grade } = await req.json();

    if (!content || !fileName) {
      return new Response(JSON.stringify({ error: "Missing content or fileName" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const prompt = `You are a schedule data extractor. Extract schedule/timetable information from the following document content.

The student is in Grade ${grade || 7}. 

Return a JSON object with a "schedule" array. Each item must have:
- "subject": string (subject name)
- "start_time": string (HH:MM format, 24-hour)
- "end_time": string (HH:MM format, 24-hour)
- "notes": string (any additional info like teacher name, room, platform link)

If the content is base64-encoded binary (PDF/image), describe what you can interpret from the text.
If it's CSV/text, parse the rows directly.

If you cannot extract any schedule data, return {"schedule": []}.

File: ${fileName} (${fileType})
Content${isBase64 ? " (base64)" : ""}:
${isBase64 ? content.substring(0, 5000) : content.substring(0, 10000)}`;

    const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
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
