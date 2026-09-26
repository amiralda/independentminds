// Cron: Sunday 9pm Haiti time (Monday 02:00 UTC, fixed UTC-5 assumed).
// Emails a weekly progress badge to parents — only when there's new
// progress this week (tasks done, points, or achievements), to avoid spam.
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

  const students = await getActiveStudents(supabase);
  const parentCache = new Map<string, ParentInfo>();
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
    if (!parent.email) { skipped++; continue; }

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

    const result = await sendResendEmail(parent.email, `${emoji} Weekly badge for ${student.display_name || "your student"} — ${label}`, html);
    await logMessage(supabase, student.parent_id, "weekly_badge", result.ok ? "sent" : "failed");
    if (result.ok) sent++; else failed++;

    if (shouldOfferAltChannel(parent.planKey, parent.notificationChannel)) {
      // Not implemented yet — WhatsApp/SMS dispatch would go here.
    }
  }

  return new Response(JSON.stringify({ success: true, sent, failed, skipped, noProgress, total: students.length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
