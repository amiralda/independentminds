// Trigger: Client betaTracker (every 30s + beacon on unload)
// Auth: JWT required
// Rate limit: none (batched)
// Side effects: Inserts beta_events, updates beta_testers.last_active_at

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

    // Get tester id
    const { data: tester } = await db
      .from('beta_testers')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!tester) {
      return new Response(JSON.stringify({ error: 'Not a beta tester' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
    }

    // Update last_active_at
    await db.from('beta_testers')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', tester.id);

    // Upsert session if provided
    if (session_data) {
      await db.from('beta_sessions').upsert({
        tester_id: tester.id,
        session_id: session_data.session_id,
        device_type: session_data.device_type ?? null,
        browser: session_data.browser ?? null,
        language: session_data.language ?? null,
        page_count: session_data.page_count ?? 0,
        event_count: session_data.event_count ?? 0,
        duration_seconds: session_data.duration_seconds ?? null,
        ended_at: session_data.ended ? new Date().toISOString() : null,
      }, { onConflict: 'session_id' });
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
