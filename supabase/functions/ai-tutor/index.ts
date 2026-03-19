import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // 1. Extract and validate Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized: missing token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Verify JWT and get user claims
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized: invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // 3. Verify user has a valid profile with an allowed role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, display_name")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Unauthorized: no profile found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["parent", "student"].includes(profile.role)) {
      return new Response(JSON.stringify({ error: "Forbidden: insufficient role" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Process the AI request
    const { messages, subjectMode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const subjectContext: Record<string, string> = {
      general: "You can help with all subjects.",
      math: "Focus on mathematics: algebra, geometry, fractions, word problems. Show step-by-step solutions with clear explanations.",
      science: "Focus on science: biology, chemistry, physics, earth science. Use real-world examples from everyday life.",
      english: "Focus on English Language Arts: grammar, reading comprehension, vocabulary, writing skills, literary devices.",
      social: "Focus on Social Studies: history, geography, government, civics, current events.",
      esl: "Focus on English as a Second Language: help with pronunciation, common phrases, vocabulary building, and translation between English and Haitian Creole.",
    };

    const modeContext = subjectContext[subjectMode || "general"] || subjectContext.general;

    const systemPrompt = `You are "Mr A", an AI tutor for homeschool students in Haiti studying Grade 7 subjects: Language Arts, Math, Science, Social Studies, and English Support.

CURRENT MODE: ${modeContext}

RULES:
- Always respond bilingually: first in English, then in Haitian Creole (HT), separated by a line break and "---"
- Use simple, age-appropriate language
- Be encouraging and patient
- Use examples from everyday life in Haiti when possible
- For math, show step-by-step solutions
- For Language Arts and English Support, help with vocabulary and reading comprehension
- For Science and Social Studies, use analogies students can relate to
- Use emojis sparingly to keep things fun
- If the student seems frustrated, be extra encouraging
- Keep answers concise but thorough
- Format responses with markdown for clarity (headers, bold, lists, etc.)

Example format:
**English:**
[explanation in English]

---

**Kreyòl:**
[explanation in Haitian Creole]`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("tutor error:", e);
    return new Response(JSON.stringify({ error: "An internal error occurred. Please try again later." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
