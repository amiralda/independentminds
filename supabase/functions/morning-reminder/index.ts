// Cron: daily 7am Haiti time (12:00 UTC, fixed UTC-5 assumed — Haiti does not
// observe DST). Emails every active student's parent with today's plan.
//
// Self-contained (no _shared/ cross-file imports — the deploy bundler could
// not resolve them for this function set; kept inline for reliability).
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

function requireCronAuth(req: Request): Response | null {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== Deno.env.get("CRON_SECRET")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return null;
}

interface ActiveStudent {
  id: string;
  display_name: string | null;
  parent_id: string;
  language_pref: string | null;
}

// "Active" = belongs to a parent whose subscription is trialing or active.
// students has no is_active flag of its own, so we key off billing status
// to avoid emailing churned/canceled accounts.
async function getActiveStudents(supabase: SupabaseClient): Promise<ActiveStudent[]> {
  const { data: students, error } = await supabase
    .from("students")
    .select("id, display_name, parent_id, language_pref");
  if (error || !students || students.length === 0) return [];

  const parentIds = [...new Set(students.map((s) => s.parent_id).filter(Boolean))];
  if (parentIds.length === 0) return [];

  const { data: subs } = await supabase
    .from("subscriptions")
    .select("user_id, status")
    .in("user_id", parentIds)
    .in("status", ["trialing", "active"]);

  const activeParentIds = new Set((subs || []).map((s) => s.user_id));
  return students.filter((s) => s.parent_id && activeParentIds.has(s.parent_id));
}

interface ParentInfo {
  email: string | null;
  planKey: string;
  notificationChannel: string | null;
}

async function getParentInfo(supabase: SupabaseClient, parentId: string): Promise<ParentInfo> {
  const [{ data: userData }, { data: sub }, { data: settings }] = await Promise.all([
    supabase.auth.admin.getUserById(parentId),
    supabase.from("subscriptions").select("plan_key").eq("user_id", parentId).maybeSingle(),
    supabase.from("parent_settings").select("notification_channel").eq("id", parentId).maybeSingle(),
  ]);
  return {
    email: userData?.user?.email ?? null,
    planKey: sub?.plan_key ?? "basic",
    notificationChannel: settings?.notification_channel ?? null,
  };
}

// TODO(whatsapp-sms): when planKey is 'plus'/'pro' and the parent's
// notification_channel is 'whatsapp' or 'both', also dispatch this
// notification via WhatsApp (see supabase/functions/_shared/whatsapp.ts ->
// sendWhatsApp()). Not implemented: WhatsApp business integration is a
// separate, currently blocked workstream. SMS has no channel/schema support
// at all yet (parent_settings has no phone/SMS column).
function shouldOfferAltChannel(planKey: string | null, notificationChannel: string | null): boolean {
  return (planKey === "plus" || planKey === "pro" || planKey === "super_pro") &&
    (notificationChannel === "whatsapp" || notificationChannel === "both");
}

async function sendResendEmail(to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY not configured" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "Independent Minds EDU <noreply@independentmindsedu.org>", to: [to], subject, html }),
  });
  const data = await res.json().catch(() => ({} as Record<string, unknown>));
  if (!res.ok) return { ok: false, error: (data as { message?: string })?.message || `Resend API error ${res.status}` };
  return { ok: true };
}

async function logMessage(supabase: SupabaseClient, parentId: string, messageType: string, status: "sent" | "failed") {
  await supabase.from("messages_log").insert({ parent_id: parentId, channel: "email", message_type: messageType, status });
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const authError = requireCronAuth(req);
  if (authError) return authError;

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Port-au-Prince" }); // YYYY-MM-DD

  const students = await getActiveStudents(supabase);
  const parentCache = new Map<string, ParentInfo>();
  let sent = 0, failed = 0, skipped = 0;

  for (const student of students) {
    if (!parentCache.has(student.parent_id)) {
      parentCache.set(student.parent_id, await getParentInfo(supabase, student.parent_id));
    }
    const parent = parentCache.get(student.parent_id)!;
    if (!parent.email) { skipped++; continue; }

    const { data: tasks } = await supabase
      .from("daily_plan")
      .select("subject, title")
      .eq("student_id", student.id)
      .eq("planned_date", today)
      .order("created_at", { ascending: true });

    const name = escapeHtml(student.display_name || "your student");
    const taskListHtml = tasks && tasks.length > 0
      ? `<ul>${tasks.map((t) => `<li>${escapeHtml(t.subject)}${t.title ? ` — ${escapeHtml(t.title)}` : ""}</li>`).join("")}</ul>`
      : `<p>No tasks are scheduled yet for today.</p>`;

    const html = `
      <h2>Good morning! ☀️</h2>
      <p>Here's ${name}'s plan for today (${today}):</p>
      ${taskListHtml}
      <hr/>
      <h3>Bonjou! ☀️</h3>
      <p>Men plan ${name} pou jodi a (${today}):</p>
      ${taskListHtml}
      <p style="color:#888;font-size:12px">— Independent Minds EDU</p>
    `;

    const result = await sendResendEmail(parent.email, `Today's plan for ${student.display_name || "your student"} — ${today}`, html);
    await logMessage(supabase, student.parent_id, "morning_reminder", result.ok ? "sent" : "failed");
    if (result.ok) sent++; else failed++;

    if (shouldOfferAltChannel(parent.planKey, parent.notificationChannel)) {
      // Not implemented yet — WhatsApp/SMS dispatch would go here.
    }
  }

  return new Response(JSON.stringify({ success: true, sent, failed, skipped, total: students.length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
