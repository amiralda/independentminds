// Cron: Sunday 9pm Haiti time (Monday 02:00 UTC, fixed UTC-5 assumed).
// Emails a weekly progress badge to parents — only when there's new
// progress this week (tasks done, points, or achievements), to avoid spam.
//
// Footer + List-Unsubscribe come from ../_shared/notification-footer.ts. (The
// old "self-contained, the bundler cannot resolve _shared" note is obsolete:
// other deployed functions import _shared/ — docs/ACTIVITY_LOG.md 2026-10-09.)
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { type NotificationCategory, prefsHeaders, renderPrefsFooter } from "../_shared/notification-footer.ts";

// Category in notification_preferences (the person can pause/stop it) and
// message_type in messages_log.
const CATEGORY: NotificationCategory = "weekly_badge";

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

async function sendResendEmail(
  to: string,
  subject: string,
  html: string,
  headers?: Record<string, string>,
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY not configured" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Independent Minds EDU <noreply@independentmindsedu.org>",
      to: [to],
      subject,
      html,
      ...(headers ? { headers } : {}),
    }),
  });
  const data = await res.json().catch(() => ({} as Record<string, unknown>));
  if (!res.ok) return { ok: false, error: (data as { message?: string })?.message || `Resend API error ${res.status}` };
  return { ok: true };
}

async function logMessage(
  supabase: SupabaseClient,
  parentId: string,
  recipientId: string,
  messageType: string,
  status: "sent" | "failed",
) {
  await supabase.from("messages_log").insert({
    parent_id: parentId,
    recipient_id: recipientId,
    channel: "email",
    message_type: messageType,
    status,
  });
}

interface Recipient {
  userId: string;
  email: string;
  kind: string;
  prefToken: string | null; // footer link + List-Unsubscribe; null on the fallback
  lang: string | null; // footer language (profiles.language_pref)
}

// Parent + every co-guardian of that parent who still receives this
// category (deleted/banned accounts and paused/stopped preferences
// excluded), with their footer token and language, in ONE call per family:
// notify_recipients_for_parent() — see
// supabase/migrations/20261009140000_notification_preferences.sql.
// If the lookup itself fails, fall back to the parent alone: a broken lookup
// must never cost the parent their email.
async function getRecipients(
  supabase: SupabaseClient,
  parentId: string,
  parentEmail: string | null,
  category: NotificationCategory,
): Promise<Recipient[]> {
  const { data, error } = await supabase.rpc("notify_recipients_for_parent", { p_parent_id: parentId, p_category: category });
  if (error || !Array.isArray(data)) {
    console.error(`notify_recipients_for_parent failed for ${parentId}: ${error?.message ?? "no data"} — parent only`);
    return parentEmail ? [{ userId: parentId, email: parentEmail, kind: "parent", prefToken: null, lang: null }] : [];
  }
  return (data as { user_id: string; email: string | null; kind: string; pref_token: string | null; lang: string | null }[])
    .filter((r) => r.email)
    .map((r) => ({ userId: r.user_id, email: r.email as string, kind: r.kind, prefToken: r.pref_token ?? null, lang: r.lang ?? null }));
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Manual test runs only (still behind the cron secret): {"only_parent_id": "<uuid>"}
// limits the run to one family. The cron sends '{}' and is unaffected.
async function readOnlyParentId(req: Request): Promise<string | null> {
  try {
    const body = await req.json();
    const id = body?.only_parent_id;
    return typeof id === "string" && UUID_RE.test(id) ? id : null;
  } catch {
    return null;
  }
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function badgeFor(rate: number): { emoji: string; label: string } {
  if (rate >= 90) return { emoji: "🏆", label: "Champion of the Week!" };
  if (rate >= 75) return { emoji: "⭐", label: "Gold Star!" };
  if (rate >= 50) return { emoji: "💪", label: "Keep Going!" };
  return { emoji: "🔄", label: "New Week, New Start!" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const authError = requireCronAuth(req);
  if (authError) return authError;

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const haitiNow = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Port-au-Prince" }));
  const dayOfWeek = haitiNow.getDay();
  const monday = new Date(haitiNow);
  monday.setDate(haitiNow.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sundayEnd = new Date(monday.getTime() + 7 * 24 * 60 * 60 * 1000);
  const mondayStr = monday.toISOString().split("T")[0];
  const sundayStr = new Date(sundayEnd.getTime() - 1).toISOString().split("T")[0];

  const onlyParentId = await readOnlyParentId(req);
  const students = (await getActiveStudents(supabase)).filter((s) => !onlyParentId || s.parent_id === onlyParentId);
  const parentCache = new Map<string, ParentInfo>();
  const recipientCache = new Map<string, Recipient[]>();
  let sent = 0, failed = 0, skipped = 0, noProgress = 0;

  for (const student of students) {
    const [{ data: tasks }, { data: points }, { data: achievements }] = await Promise.all([
      supabase.from("daily_plan").select("status, subject")
        .eq("student_id", student.id).gte("planned_date", mondayStr).lte("planned_date", sundayStr),
      supabase.from("reward_points").select("points")
        .eq("student_id", student.id).gte("awarded_at", monday.toISOString()).lt("awarded_at", sundayEnd.toISOString()),
      supabase.from("achievements").select("badge_type, milestone")
        .eq("student_id", student.id).gte("earned_at", monday.toISOString()).lt("earned_at", sundayEnd.toISOString()),
    ]);

    const total = tasks?.length || 0;
    const done = tasks?.filter((t) => t.status === "done").length || 0;
    const pointsSum = (points || []).reduce((sum, p) => sum + (p.points || 0), 0);
    const hasProgress = done > 0 || pointsSum !== 0 || (achievements?.length || 0) > 0;

    if (!hasProgress) { noProgress++; continue; }

    if (!parentCache.has(student.parent_id)) {
      parentCache.set(student.parent_id, await getParentInfo(supabase, student.parent_id));
    }
    const parent = parentCache.get(student.parent_id)!;
    if (!recipientCache.has(student.parent_id)) {
      recipientCache.set(student.parent_id, await getRecipients(supabase, student.parent_id, parent.email, CATEGORY));
    }
    const recipients = recipientCache.get(student.parent_id)!;
    if (recipients.length === 0) { skipped++; continue; }

    const rate = total > 0 ? Math.round((done / total) * 100) : 0;
    const { emoji, label } = badgeFor(rate);
    const name = escapeHtml(student.display_name || "your student");
    const achievementList = (achievements || []).map((a) => `🏅 ${escapeHtml(a.badge_type)}`).join("<br/>") || "—";

    const html = `
      <h2>${emoji} Weekly badge — ${label}</h2>
      <p><b>${name}</b> — ${mondayStr} to ${sundayStr}</p>
      <p>Tasks completed: <b>${done}/${total}</b> (${rate}%)</p>
      <p>Points earned this week: <b>${pointsSum}</b></p>
      <p>New achievements:<br/>${achievementList}</p>
      <hr/>
      <h3>${emoji} Badge chak semèn — ${label}</h3>
      <p><b>${name}</b> — ${mondayStr} rive ${sundayStr}</p>
      <p>Tach fini: <b>${done}/${total}</b> (${rate}%)</p>
      <p>Pwen genyen semèn sa a: <b>${pointsSum}</b></p>
      <p>Nouvo badge:<br/>${achievementList}</p>
      <p style="color:#888;font-size:12px">— Independent Minds EDU</p>
    `;

    const subject = `${emoji} Weekly badge for ${student.display_name || "your student"} — ${label}`;
    for (const r of recipients) {
      // Body is shared (bilingual EN/HT); the footer is per recipient.
      const footer = renderPrefsFooter({
        language: r.lang,
        kind: r.kind,
        studentName: student.display_name || "your student",
        category: CATEGORY,
        token: r.prefToken,
      });
      const headers = r.prefToken ? prefsHeaders(r.prefToken, CATEGORY) : undefined;
      const result = await sendResendEmail(r.email, subject, html + footer, headers);
      await logMessage(supabase, student.parent_id, r.userId, CATEGORY, result.ok ? "sent" : "failed");
      if (result.ok) sent++; else failed++;
    }

    if (shouldOfferAltChannel(parent.planKey, parent.notificationChannel)) {
      // Not implemented yet — WhatsApp/SMS dispatch would go here.
    }
  }

  return new Response(JSON.stringify({ success: true, sent, failed, skipped, noProgress, total: students.length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
