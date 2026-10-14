// generate-article — admin-only. Writes newsletter articles into
// email_newsletter_drafts with service_role (clients have no INSERT policy).
//
//   { action: "draft", topic, scheduled_for, campaign }
//     -> writes the English version with gpt-4.1 from the topic + IME_FACTS,
//        inserts the EN row (pending_approval). 409 if the campaign exists,
//        422 (nothing saved) if the text did not come out in English.
//   { action: "translate", campaign, language }
//     -> translates the EN row into one language and inserts it
//        (pending_approval). Already there -> 200 { skipped: true }.
//
// Never sends email, never approves, never updates or deletes a row, never
// logs the topic or the AI's text.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { IME_FACTS } from "../_shared/ime-facts.ts";
import {
  TRANSLATION_LANGUAGES, checkScheduledFor, isValidCampaign, looksEnglish, type ArticleLanguage,
} from "../_shared/article-generation.ts";
import { haitiDate } from "../_shared/haiti-time.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TABLE = "email_newsletter_drafts";
const MAX_TOPIC = 8000;

const LANGUAGE_NAMES: Record<ArticleLanguage, string> = {
  EN: "English", HT: "Haitian Creole (Kreyòl Ayisyen)", FR: "French", ES: "Spanish", PT: "Portuguese",
  AR: "Arabic", ZH: "Simplified Chinese", DE: "German", JA: "Japanese", RU: "Russian",
};

export const DRAFT_SYSTEM_PROMPT = `WRITE THE ARTICLE IN ENGLISH, whatever the language of the topic. The title and the whole content must be in English. Example: a topic written in French or in Haitian Creole -> an article written in English (the 9 other languages are translated from it later).

You write newsletter articles for Independent Minds EDU (IME), a web platform for families who homeschool.

FACT BASE — the only features you may describe:
"""
${IME_FACTS}
"""

Rules:
- The fact base is the complete list. If something is not written in it, it does not exist: do not deduce it, do not complete it, do not assume it. Never invent a feature, a plan, a price, a date or an integration. If the topic asks about something that does not exist, write the article without it (do not say it is coming).
- Length: 500-700 words.
- Structure: at most 4 sections with "## " headings. No "Conclusion" section (and no closing summary section under another name).
- Start with a problem or an observation about families' lives, not with a list of what the platform does.
- Mention at most 3 IME features in the whole article, and only where they answer the problem described. The article is about the problem, not a feature brochure.
- Markdown: "## " for section headings, **bold** for key words. No H1 — the title goes in the "title" field only.
- Tone: analytical and concrete. No marketing language. Never use "revolutionary", "game-changing", "empower" or similar hype words.
- Use English words only: no French, Kreyòl or other words (only the names Independent Minds EDU, IME and Mr A).
- No focus on a single country or culture: IME is a global platform.
- Use numbers, studies or quotes ONLY if the topic provides them, exactly as given, with the source the topic gives. NEVER invent statistics, studies or quotes.
- Respond with a JSON object only: {"title": "...", "content": "... markdown ..."}`;

export function translateSystemPrompt(language: ArticleLanguage): string {
  const name = LANGUAGE_NAMES[language];
  const extra: Partial<Record<ArticleLanguage, string>> = {
    HT: `
- Haitian Creole: standard, natural Kreyòl Ayisyen — not a literal translation from French. Standard spelling (è, ò). Correct contractions: m ap, w ap, l ap, n ap, y ap, p ap, t ap. Never use "à" in Kreyòl words. Never use French words (e.g. not "fonctionnalités": write "fonksyon"). Do not invent words for technical terms: keep them in English and fit them naturally into Kreyòl grammar.`,
    AR: `
- Arabic: write so the text reads correctly right-to-left. Keep the Markdown markers ("## ", "**", "- ") in place; Latin-script proper names stay as they are.`,
  };
  return `You translate newsletter articles from English into ${name}.

Rules:
- Translate the MEANING, not word for word. The text must read as if a native ${name} speaker wrote it.
- Keep the Markdown structure and the same sections, in the same order.
- Do not add or remove information.
- Use ${name} words only: no words from another language, except the names below${language === "HT" ? " and the technical terms kept in English (see below)" : ""}.
- These names stay unchanged: Independent Minds EDU, IME, Mr A, Manager, Co-Guardian.${extra[language] ?? ""}
- Respond with a JSON object only: {"title": "...", "content": "... markdown ..."}`;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

type Article = { title: string; content: string };

/** One gpt-4.1 call returning {title, content}. Errors never include the AI's text. */
async function callAI(system: string, user: string): Promise<Article> {
  const url = Deno.env.get("AI_GATEWAY_URL");
  const key = Deno.env.get("AI_GATEWAY_API_KEY");
  if (!url || !key) throw new Error("AI gateway not configured");
  const response = await fetch(`${url}/v1/chat/completions`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4.1",
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      response_format: { type: "json_object" },
    }),
  });
  if (!response.ok) throw new Error(`AI API error [${response.status}]`);
  const data = await response.json();
  let parsed: unknown;
  try {
    parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "");
  } catch {
    throw new Error("AI returned invalid JSON");
  }
  const { title, content } = (parsed ?? {}) as Record<string, unknown>;
  if (typeof title !== "string" || !title.trim() || typeof content !== "string" || !content.trim()) {
    throw new Error("AI returned no title or content");
  }
  // The title lives in its own field: drop a leading H1 if the model added one.
  return { title: title.trim(), content: content.trim().replace(/^# [^\n]*\n+/, "") };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized: missing token" }, 401);

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user: caller }, error: authError } = await anonClient.auth.getUser();
    if (authError || !caller) return json({ error: "Unauthorized: invalid session" }, 401);

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Admin-only.
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Forbidden: admin role required" }, 403);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "Invalid JSON body" }, 400);

    if (body.action === "draft") {
      const { topic, scheduled_for, campaign } = body;
      if (typeof topic !== "string" || !topic.trim()) return json({ error: "Missing topic" }, 400);
      if (topic.length > MAX_TOPIC) return json({ error: `Topic too long (max ${MAX_TOPIC} characters)` }, 400);
      if (!isValidCampaign(campaign)) {
        return json({ error: "Invalid campaign: 3-60 characters, lowercase letters, digits and hyphens only" }, 400);
      }
      const check = checkScheduledFor(scheduled_for, haitiDate());
      if (!check.ok) {
        const messages = {
          invalid: "Invalid publication date (expected YYYY-MM-DD)",
          past: "The publication date must be in the future",
          not_saturday: "The publication date must be a Saturday (the newsletter is sent on Saturdays)",
        };
        const hint = check.suggestion ? `. Nearest Saturday: ${check.suggestion}` : "";
        return json({ error: messages[check.reason] + hint, reason: check.reason, suggestion: check.suggestion }, 400);
      }

      const { data: existing, error: existErr } = await admin.from(TABLE).select("id").eq("campaign", campaign).limit(1);
      if (existErr) throw new Error(`lookup failed [${existErr.code ?? "db"}]`);
      if (existing && existing.length > 0) return json({ error: "Campaign already exists" }, 409);

      const article = await callAI(DRAFT_SYSTEM_PROMPT, `Topic (from the editor; may include figures and sources to use; it may be in any language — write the article in English):\n"""\n${topic.trim()}\n"""`);
      // The EN row is the source of the 9 translations: never store another language as EN.
      if (!looksEnglish(`${article.title}\n${article.content}`)) {
        return json({ error: "The article did not come out in English, so nothing was saved. Click Generate again." }, 422);
      }

      const { error: insErr } = await admin.from(TABLE).insert({
        campaign, language: "EN", title: article.title, content: article.content,
        status: "pending_approval", scheduled_for,
      });
      if (insErr?.code === "23505") return json({ error: "Campaign already exists" }, 409);
      if (insErr) throw new Error(`insert failed [${insErr.code ?? "db"}]`);

      return json({ campaign, title: article.title, content: article.content });
    }

    if (body.action === "translate") {
      const { campaign, language } = body;
      if (!isValidCampaign(campaign)) return json({ error: "Invalid campaign" }, 400);
      if (!TRANSLATION_LANGUAGES.includes(language)) return json({ error: "Invalid language" }, 400);

      const { data: en, error: enErr } = await admin
        .from(TABLE)
        .select("title, content, status, scheduled_for")
        .eq("campaign", campaign)
        .eq("language", "EN")
        .maybeSingle();
      if (enErr) throw new Error(`lookup failed [${enErr.code ?? "db"}]`);
      if (!en) return json({ error: "English version not found" }, 404);

      const { data: already, error: alErr } = await admin
        .from(TABLE)
        .select("id")
        .eq("campaign", campaign)
        .eq("language", language)
        .maybeSingle();
      if (alErr) throw new Error(`lookup failed [${alErr.code ?? "db"}]`);
      if (already) return json({ skipped: true });

      // Never add a language to an article that was already approved or sent.
      if (en.status !== "pending_approval") return json({ error: `Article is ${en.status}; translations are only added while pending approval` }, 409);

      const article = await callAI(
        translateSystemPrompt(language),
        JSON.stringify({ title: en.title, content: en.content }),
      );

      const { error: insErr } = await admin.from(TABLE).insert({
        campaign, language, title: article.title, content: article.content,
        status: "pending_approval", scheduled_for: en.scheduled_for,
      });
      if (insErr?.code === "23505") return json({ skipped: true });
      if (insErr) throw new Error(`insert failed [${insErr.code ?? "db"}]`);

      return json({ campaign, language, title: article.title });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    // Only our own messages (no topic, no AI text) reach the log and the client.
    const message = error instanceof Error ? error.message : "unknown";
    console.error("generate-article error:", message);
    return json({ error: `Generation failed: ${message}` }, 500);
  }
});
