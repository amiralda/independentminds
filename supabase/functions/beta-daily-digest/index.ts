// Trigger: Cron daily at 11:00 UTC (07:00 Haiti)
// Auth: Cron secret
// Rate limit: none
// Side effects: Sends digest email to BETA_ADMIN_EMAIL

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
    const cronSecret = req.headers.get('x-cron-secret');
    if (cronSecret !== Deno.env.get('CRON_SECRET')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    );

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Gather stats
    const [
      { count: newTesters },
      { count: feedbackCount },
      { count: eventsCount },
      { data: config },
    ] = await Promise.all([
      db.from('beta_testers').select('*', { count: 'exact', head: true })
        .gte('joined_at', since),
      db.from('beta_feedback').select('*', { count: 'exact', head: true })
        .gte('created_at', since),
      db.from('beta_events').select('*', { count: 'exact', head: true })
        .gte('created_at', since),
      db.from('beta_config').select('*').eq('id', 1).single(),
    ]);

    // NPS average
    const { data: npsData } = await db
      .from('beta_feedback')
      .select('nps_score')
      .eq('feedback_type', 'nps')
      .gte('created_at', since)
      .not('nps_score', 'is', null);
    const avgNps = npsData && npsData.length > 0
      ? (npsData.reduce((s: number, r: unknown) => s + r.nps_score, 0) / npsData.length).toFixed(1)
      : 'N/A';

    const html = `
      <h2>Beta Daily Digest — ${new Date().toLocaleDateString()}</h2>
      <p><strong>Phase:</strong> ${config?.phase ?? 'unknown'}</p>
      <p><strong>Total testers:</strong> ${config?.current_testers ?? 0} / ${config?.max_testers ?? 50}</p>
      <hr>
      <h3>Last 24 Hours</h3>
      <ul>
        <li>New testers: ${newTesters ?? 0}</li>
        <li>Feedback submissions: ${feedbackCount ?? 0}</li>
        <li>Events tracked: ${eventsCount ?? 0}</li>
        <li>Average NPS: ${avgNps}</li>
      </ul>
    `;

    const adminEmail = Deno.env.get('BETA_ADMIN_EMAIL');
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (adminEmail && resendKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Independent Minds EDU <noreply@independentmindsedu.com>',
          to: [adminEmail],
          subject: `Beta Digest — ${new Date().toLocaleDateString()}`,
          html,
        }),
      });
    }

    return new Response(JSON.stringify({ ok: true, newTesters, feedbackCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
