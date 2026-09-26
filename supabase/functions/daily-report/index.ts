// Cron: daily 8pm Haiti time (01:00 UTC, fixed UTC-5 assumed). Emails each
// active student's parent a same-day summary (check-ins + tasks done).
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const authError = requireCronAuth(req);
  if (authError) return authError;

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const now = new Date();
  const haitiMidnight = new Date(now.toLocaleString("en-US", { timeZone: "America/Port-au-Prince" }));
  haitiMidnight.setHours(0, 0, 0, 0);
  const dayStart = haitiMidnight.toISOString();
  const dayEnd = new Date(haitiMidnight.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const today = now.toLocaleDateString("en-CA", { timeZone: "America/Port-au-Prince" });

  const students = await getActiveStudents(supabase);
  const parentCache = new Map<string, ParentInfo>();
  let sent = 0, failed = 0, skipped = 0;

  for (const student of students) {
    if (!parentCache.has(student.parent_id)) {
      parentCache.set(student.parent_id, await getParentInfo(supabase, student.parent_id));
    }
    const parent = parentCache.get(student.parent_id)!;
    if (!parent.email) { skipped++; continue; }

    const [{ data: tasks }, { data: checkIns }] = await Promise.all([
      supabase.from("daily_plan").select("subject, title, status")
        .eq("student_id", student.id).eq("planned_date", today),
      supabase.from("check_ins").select("mood, focus, progress, help_needed, note")
        .eq("student_id", student.id).gte("checked_in_at", dayStart).lt("checked_in_at", dayEnd)
        .order("checked_in_at", { ascending: false }),
    ]);

    const total = tasks?.length || 0;
    const done = tasks?.filter((t) => t.status === "done").length || 0;
    const doneList = tasks?.filter((t) => t.status === "done").map((t) => t.subject).join(", ") || "—";
    const notDoneList = tasks?.filter((t) => t.status !== "done").map((t) => t.subject).join(", ") || "—";
    const latestCheckIn = checkIns?.[0];
    const helpFlag = checkIns?.some((c) => c.help_needed);

    const name = escapeHtml(student.display_name || "your student");
    const html = `
      <h2>Daily report — ${today} 📊</h2>
      <p><b>${name}</b></p>
      <p>Completed: <b>${done}/${total}</b> tasks (${doneList})</p>
      <p>Not done: ${notDoneList}</p>
      <p>Check-ins today: ${checkIns?.length || 0}${latestCheckIn ? ` — latest mood: ${escapeHtml(latestCheckIn.mood || "n/a")}, focus: ${latestCheckIn.focus ?? "n/a"}/5` : ""}</p>
      ${helpFlag ? `<p style="color:#c0392b"><b>⚠️ Help was requested during a check-in today.</b></p>` : ""}
      <hr/>
      <h3>Rapò jounalye — ${today} 📊</h3>
      <p><b>${name}</b></p>
      <p>Fini: <b>${done}/${total}</b> tach (${doneList})</p>
      <p>Pa fini: ${notDoneList}</p>
      <p>Check-in jodi a: ${checkIns?.length || 0}${latestCheckIn ? ` — dènye imè: ${escapeHtml(latestCheckIn.mood || "n/a")}, konsantrasyon: ${latestCheckIn.focus ?? "n/a"}/5` : ""}</p>
      ${helpFlag ? `<p style="color:#c0392b"><b>⚠️ Yo mande èd pandan yon check-in jodi a.</b></p>` : ""}
      <p style="color:#888;font-size:12px">— Independent Minds EDU</p>
    `;

    const result = await sendResendEmail(parent.email, `Daily report for ${student.display_name || "your student"} — ${today}`, html);
    await logMessage(supabase, student.parent_id, "daily_report", result.ok ? "sent" : "failed");
    if (result.ok) sent++; else failed++;

    if (shouldOfferAltChannel(parent.planKey, parent.notificationChannel)) {
      // Not implemented yet — WhatsApp/SMS dispatch would go here.
    }
  }

  return new Response(JSON.stringify({ success: true, sent, failed, skipped, total: students.length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
