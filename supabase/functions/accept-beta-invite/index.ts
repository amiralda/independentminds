// Trigger: /beta/accept page
// Auth: JWT required
// Rate limit: none
// Side effects: Creates beta_testers row, task completions, updates invite

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

    const { token } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ error: 'Token required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const db = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Validate token
    const { data: invite, error: invErr } = await db
      .from('beta_invites')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .maybeSingle();

    if (invErr) throw invErr;
    if (!invite) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired invite token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      await db.from('beta_invites')
        .update({ status: 'expired' })
        .eq('id', invite.id);
      return new Response(
        JSON.stringify({ error: 'This invitation has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Check capacity
    const { data: config } = await db
      .from('beta_config')
      .select('max_testers, current_testers')
      .eq('id', 1)
      .single();

    if (config && config.current_testers >= (config.max_testers ?? 50)) {
      return new Response(
        JSON.stringify({ error: 'Beta is currently full' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Check if already a tester
    const { data: existing } = await db
      .from('beta_testers')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      // Already a tester, just mark invite accepted
      await db.from('beta_invites')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', invite.id);
      return new Response(JSON.stringify({
        success: true, tester_type: invite.tester_type,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get tasks for this tester type
    const { data: tasks } = await db
      .from('beta_tasks')
      .select('id')
      .eq('tester_type', invite.tester_type);

    const taskCount = tasks?.length ?? 0;

    // Create tester
    const { data: tester, error: testerErr } = await db
      .from('beta_testers')
      .insert({
        user_id: user.id,
        tester_type: invite.tester_type,
        tasks_total: taskCount,
        beta_phase: config ? 'active' : 'closed',
      })
      .select()
      .single();

    if (testerErr) throw testerErr;

    // Create task completions
    if (tasks && tasks.length > 0) {
      const completions = tasks.map((t: any) => ({
        tester_id: tester.id,
        task_id: t.id,
        status: 'pending',
      }));
      await db.from('beta_task_completions').insert(completions);
    }

    // Update invite
    await db.from('beta_invites')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', invite.id);

    // Increment current_testers
    if (config) {
      await db.from('beta_config')
        .update({ current_testers: (config.current_testers ?? 0) + 1 })
        .eq('id', 1);
    }

    return new Response(JSON.stringify({
      success: true, tester_type: invite.tester_type,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
