// Trigger: Client betaTracker (every 30s + beacon on unload)
// Auth: JWT required
// Rate limit: none (batched)
// Side effects: Inserts beta_events, updates beta_testers.last_active_at,
//   creates admin_notifications for errors (deduped) and task difficulty

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization')!;
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { events, session_data } = await req.json();

    const db = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Get tester id + display name
    const { data: tester } = await db
      .from('beta_testers')
      .select('id, user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!tester) {
      return new Response(JSON.stringify({ error: 'Not a beta tester' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get tester display name for notifications
    const { data: profile } = await db
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle();
    const testerName = profile?.display_name || 'A tester';

    // Insert events (max 50)
    if (events && Array.isArray(events) && events.length > 0) {
      const rows = events.slice(0, 50).map((e: any) => ({
        tester_id: tester.id,
        event_type: e.event_type,
        page_path: e.page_path ?? null,
        feature_name: e.feature_name ?? null,
        element_selector: e.element_selector ?? null,
        metadata: e.metadata ?? null,
        session_id: e.session_id ?? null,
        duration_ms: e.duration_ms ?? null,
      }));
      await db.from('beta_events').insert(rows);

      // Check for error events → admin notification (deduped: 1 per tester per hour)
      const errorEvents = events.filter((e: any) => e.event_type === 'error');
      if (errorEvents.length > 0) {
        await notifyAdminsOfError(db, tester.id, testerName, errorEvents[0]);
      }

      // Check for bug_report events → admin notification (always insert)
      const bugReports = events.filter((e: any) => e.event_type === 'bug_report');
      for (const bug of bugReports) {
        await notifyAdminsOfBugReport(db, tester.id, testerName, bug);
      }

      // Check for task_completion events → difficulty analysis
      const taskCompletions = events.filter((e: any) => e.event_type === 'task_completion');
      for (const tc of taskCompletions) {
        await analyzeTaskDifficulty(db, tester.id, testerName, tc);
      }
    }

    // Update last_active_at
    await db.from('beta_testers')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', tester.id);

    // Upsert session if provided
    if (session_data) {
      const sessionRow: Record<string, any> = {
        tester_id: tester.id,
        session_id: session_data.session_id,
        device_type: session_data.device_type ?? null,
        browser: session_data.browser ?? null,
        language: session_data.language ?? null,
        page_count: session_data.page_count ?? 0,
        event_count: session_data.event_count ?? 0,
        duration_seconds: session_data.duration_seconds ?? null,
        ended_at: session_data.ended ? new Date().toISOString() : null,
      };
      if (session_data.recording_url) {
        sessionRow.recording_url = session_data.recording_url;
      }
      await db.from('beta_sessions').upsert(sessionRow, { onConflict: 'session_id' });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ── Error notification with 1-hour dedup per tester ──
async function notifyAdminsOfError(
  db: any,
  testerId: string,
  testerName: string,
  errorEvent: any,
) {
  const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
  const errorMessage = errorEvent.metadata?.message || 'Unknown error';
  const pagePath = errorEvent.page_path || '/';

  // Get all admins
  const { data: admins } = await db
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin');

  if (!admins || admins.length === 0) return;

  for (const admin of admins) {
    // Check dedup: any unread beta_error for this tester in last hour?
    const { data: existing } = await db
      .from('admin_notifications')
      .select('id')
      .eq('admin_id', admin.user_id)
      .eq('notification_type', 'beta_error')
      .eq('is_read', false)
      .gte('created_at', oneHourAgo)
      .limit(1);

    // Also check metadata for same tester_id
    if (existing && existing.length > 0) continue;

    await db.from('admin_notifications').insert({
      admin_id: admin.user_id,
      title: 'Beta Error Detected',
      body: `${testerName} encountered an error on ${pagePath}: ${errorMessage.slice(0, 150)}`,
      notification_type: 'beta_error',
      is_read: false,
      metadata: {
        tester_id: testerId,
        tester_name: testerName,
        page_path: pagePath,
        error_message: errorMessage,
        error_stack: errorEvent.metadata?.stack?.slice(0, 500) ?? null,
      },
    });
  }
}

// ── Task difficulty analysis ──
async function analyzeTaskDifficulty(
  db: any,
  testerId: string,
  testerName: string,
  completionEvent: any,
) {
  const taskId = completionEvent.metadata?.task_id;
  if (!taskId) return;

  const thirtyMinAgo = new Date(Date.now() - 30 * 60_000).toISOString();

  // Query recent events for this tester
  const { data: recentEvents } = await db
    .from('beta_events')
    .select('event_type, created_at')
    .eq('tester_id', testerId)
    .gte('created_at', thirtyMinAgo)
    .order('created_at', { ascending: true });

  if (!recentEvents || recentEvents.length === 0) return;

  const rageClicks = recentEvents.filter((e: any) => e.event_type === 'rage_click').length;
  const errors = recentEvents.filter((e: any) => e.event_type === 'error').length;
  const pageViews = recentEvents.filter((e: any) => e.event_type === 'page_view').length;

  const firstTime = new Date(recentEvents[0].created_at).getTime();
  const lastTime = new Date(recentEvents[recentEvents.length - 1].created_at).getTime();
  const timeOnTaskSec = Math.floor((lastTime - firstTime) / 1000);

  // Calculate difficulty score (0-9)
  let score = 0;
  if (rageClicks >= 3) score += 3;
  if (errors >= 1) score += 3;
  if (timeOnTaskSec > 600) score += 2; // > 10 min
  if (pageViews > 8) score += 1;

  // Update the task completion record
  await db
    .from('beta_task_completions')
    .update({
      difficulty_score: score,
      time_on_task: timeOnTaskSec,
      rage_clicks_count: rageClicks,
      errors_count: errors,
    })
    .eq('tester_id', testerId)
    .eq('task_id', taskId);

  // If hard (score >= 6), notify admins (once per tester per task)
  if (score >= 6) {
    const { data: task } = await db
      .from('beta_tasks')
      .select('title_key')
      .eq('id', taskId)
      .maybeSingle();

    const taskTitle = task?.title_key || taskId;
    const minutes = Math.round(timeOnTaskSec / 60);

    const { data: admins } = await db
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (!admins) return;

    for (const admin of admins) {
      // Dedup: one alert per tester per task
      const { data: existing } = await db
        .from('admin_notifications')
        .select('id')
        .eq('admin_id', admin.user_id)
        .eq('notification_type', 'task_difficulty')
        .contains('metadata', { tester_id: testerId, task_id: taskId })
        .limit(1);

      if (existing && existing.length > 0) continue;

      await db.from('admin_notifications').insert({
        admin_id: admin.user_id,
        title: 'Task Difficulty Alert',
        body: `${testerName} struggled with ${taskTitle} (score: ${score}/9 — ${rageClicks} rage clicks, ${errors} errors, ${minutes} minutes)`,
        notification_type: 'task_difficulty',
        is_read: false,
        metadata: {
          tester_id: testerId,
          tester_name: testerName,
          task_id: taskId,
          task_title: taskTitle,
          difficulty_score: score,
          rage_clicks: rageClicks,
          errors_count: errors,
          time_on_task: timeOnTaskSec,
        },
      });
    }
  }
}
