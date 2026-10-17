// Hourly admin alert monitor.
// Trigger: pg_cron every hour via net.http_post (x-cron-secret header, value
// read from Vault 'cron_secret').
// Side effects: inserts admin_notifications only (no emails, no Telegram).
//
// History: this function used to also run a legacy "compliance" monitor
// (Telegram nudges to students/parents, auto-marking tasks "Missed") written
// for a schema that no longer exists (students.monitoring_enabled,
// daily_plan.plan_date/start_time...). It was removed on 2026-09-26 by
// decision; only the admin alert rules below remain. Rule 6 (signup blackout)
// was added 2026-10-17 after a 17-day silent signup outage; see its comment.
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assessSignupBlackout } from "../_shared/monitor-rules.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

interface Alert {
  type: string;
  /** Skip if this admin already has an unread alert of this type since then. */
  dedupSince: string;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
}

async function notifyAdmins(supabase: SupabaseClient, adminIds: string[], alert: Alert): Promise<number> {
  let created = 0;
  for (const adminId of adminIds) {
    const { data: existing } = await supabase.from("admin_notifications")
      .select("id").eq("admin_id", adminId)
      .eq("notification_type", alert.type).eq("is_read", false)
      .gte("created_at", alert.dedupSince).limit(1);
    if (existing && existing.length > 0) continue;
    const { error } = await supabase.from("admin_notifications").insert({
      admin_id: adminId,
      title: alert.title,
      body: alert.body,
      notification_type: alert.type,
      is_read: false,
      metadata: alert.metadata,
    });
    if (error) console.error(`[hourly-monitor] insert ${alert.type} failed:`, error);
    else created++;
  }
  return created;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== Deno.env.get("CRON_SECRET")) return json({ error: "Unauthorized" }, 401);

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
    const sixHoursAgo = new Date(Date.now() - 6 * 3600_000).toISOString();
    const oneDayAgo = new Date(Date.now() - 86400_000).toISOString();

    const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
    const adminIds = (admins ?? []).map((a: { user_id: string }) => a.user_id);
    if (adminIds.length === 0) return json({ success: true, admins: 0, created: {} });

    const created: Record<string, number> = {};
    const add = async (alert: Alert) => {
      created[alert.type] = (created[alert.type] ?? 0) + await notifyAdmins(supabase, adminIds, alert);
    };

    // RULE 1: Error spike — 5+ errors on the same page in 1 hour
    const { data: recentErrors } = await supabase
      .from("platform_errors").select("page_path").gte("created_at", oneHourAgo);
    const pageCounts: Record<string, number> = {};
    for (const e of recentErrors ?? []) pageCounts[e.page_path || "/"] = (pageCounts[e.page_path || "/"] || 0) + 1;
    for (const [page, count] of Object.entries(pageCounts)) {
      if (count < 5) continue;
      await add({
        type: "error_spike", dedupSince: oneHourAgo,
        title: "Error Spike Detected",
        body: `${count} errors on ${page} in the last hour. Possible critical bug.`,
        metadata: { page_path: page, error_count: count },
      });
    }

    // RULE 2: Low rating — average below 3.0 in the last 24h (3+ ratings)
    const { data: ratings } = await supabase
      .from("user_feedback").select("rating")
      .eq("feedback_type", "rating").gte("created_at", oneDayAgo).not("rating", "is", null);
    if (ratings && ratings.length >= 3) {
      const avg = ratings.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / ratings.length;
      if (avg < 3.0) {
        await add({
          type: "low_rating", dedupSince: oneDayAgo,
          title: "Low User Satisfaction Alert",
          body: `Average rating dropped to ${avg.toFixed(1)}/5 in the last 24 hours (${ratings.length} responses).`,
          metadata: { average_rating: avg, response_count: ratings.length },
        });
      }
    }

    // RULE 3: Feature request trend — 3+ in the same category in 24h
    const { data: features } = await supabase
      .from("user_feedback").select("category")
      .eq("feedback_type", "feature").gte("created_at", oneDayAgo).not("category", "is", null);
    const catCounts: Record<string, number> = {};
    for (const f of features ?? []) catCounts[f.category || "Other"] = (catCounts[f.category || "Other"] || 0) + 1;
    for (const [cat, count] of Object.entries(catCounts)) {
      if (count < 3) continue;
      await add({
        type: "feature_trend", dedupSince: oneDayAgo,
        title: "Feature Request Trend",
        body: `${count} users requested improvements to ${cat} in the last 24 hours.`,
        metadata: { category: cat, request_count: count },
      });
    }

    // RULE 4: Auth failure spike — 10+ failures in 1 hour
    const { count: authFailureCount } = await supabase
      .from("auth_failures").select("id", { count: "exact", head: true }).gte("created_at", oneHourAgo);
    if ((authFailureCount ?? 0) >= 10) {
      await add({
        type: "auth_failure_spike", dedupSince: sixHoursAgo,
        title: "Auth Failure Spike Detected",
        body: `${authFailureCount} login failures were recorded in the last hour. Review auth_failures for details.`,
        metadata: { auth_failure_count: authFailureCount },
      });
    }

    // RULE 5: Stripe payment failures in the last hour
    const { count: paymentFailureCount } = await supabase
      .from("billing_events").select("id", { count: "exact", head: true })
      .eq("type", "invoice.payment_failed").gte("created_at", oneHourAgo);
    if ((paymentFailureCount ?? 0) > 0) {
      await add({
        type: "payment_failure", dedupSince: sixHoursAgo,
        title: "Payment Failure Alert",
        body: `${paymentFailureCount} Stripe payment failure event(s) were recorded in the last hour.`,
        metadata: { payment_failure_count: paymentFailureCount },
      });
    }

    // RULE 6: Signup blackout — no new account in 7 days.
    //
    // Added 2026-10-17 after a TOTAL signup outage ran for 17 days unnoticed:
    // the Supabase Auth SMTP credential expired, so every /signup and /recover
    // returned 500 and nobody could create an account or reset a password.
    //
    // Nothing in this database could see it. When GoTrue fails to send the
    // confirmation email it rolls the new user back, so auth.users gains no
    // row, and auth.audit_log_entries is empty on this project (audit events
    // go to the log pipeline instead). The app's own email kept working the
    // whole time — 168 sends, 0 failures — because that path is the Resend
    // API, not Auth's SMTP. Every existing signal was green.
    //
    // This rule is deliberately weak: it measures the absence of success, not
    // the presence of failure, so it cannot tell a real outage from a quiet
    // week, and it takes 7 days to speak. It exists to put a FLOOR on how long
    // a total outage can hide — 7 days instead of 17 and counting. The real
    // fix is an active probe that exercises the auth email path on a schedule;
    // see docs/ACTIVITY_LOG.md for that decision, which needs a probe mailbox.
    //
    // profiles is used rather than auth.users because handle_new_user creates
    // exactly one profile per signup (verified 2026-10-17: 10 users, 10
    // profiles, timestamps equal to the millisecond) and the auth schema is
    // not exposed through PostgREST.
    const SIGNUP_BLACKOUT_DAYS = 7;
    const blackoutCutoff = new Date(Date.now() - SIGNUP_BLACKOUT_DAYS * 86400_000).toISOString();
    const { count: recentSignups, error: signupErr } = await supabase
      .from("profiles").select("id", { count: "exact", head: true }).gte("created_at", blackoutCutoff);

    if (signupErr) {
      console.error("[hourly-monitor] signup blackout check failed:", signupErr);
    } else {
      const { data: newest } = await supabase
        .from("profiles").select("created_at").order("created_at", { ascending: false }).limit(1);
      const lastSignupAt = (newest?.[0]?.created_at as string | undefined) ?? null;
      const verdict = assessSignupBlackout(
        recentSignups ?? 0, lastSignupAt, new Date(), SIGNUP_BLACKOUT_DAYS,
      );

      if (verdict.alert) {
        await add({
          type: "signup_blackout",
          // Once a day at most: a slow-moving condition, not an incident feed.
          dedupSince: oneDayAgo,
          title: `No new signups in ${SIGNUP_BLACKOUT_DAYS} days`,
          body: `No account has been created in ${SIGNUP_BLACKOUT_DAYS} days `
            + `(the last one was ${verdict.daysQuiet} days ago). If that is unexpected, try signing up and `
            + `resetting a password yourself: an expired Auth SMTP credential looks exactly like this `
            + `and leaves no other trace anywhere.`,
          metadata: {
            last_signup_at: lastSignupAt,
            days_since_last_signup: verdict.daysQuiet,
            threshold_days: SIGNUP_BLACKOUT_DAYS,
            how_to_check: "Supabase > Authentication > Emails > SMTP Settings, then try /forgot-password in production",
          },
        });
      }
    }

    return json({ success: true, admins: adminIds.length, created });
  } catch (error) {
    console.error("[hourly-monitor] error:", error);
    return json({ error: "Internal server error" }, 500);
  }
});
