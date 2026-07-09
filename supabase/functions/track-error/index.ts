// Trigger: Global errorTracker client (every 30s + beacon)
// Auth: JWT required (authenticated users only)
// Rate limit: built-in dedup (same error + user within 30 min)
// Side effects: Inserts platform_errors, admin_notifications for critical pages

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const CRITICAL_PAGES = ['/', '/login', '/admin', '/admin/system'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!;

    // Auth check — REQUIRED. Reject anonymous callers to prevent spam of platform_errors/admin_notifications.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId: string = user.id;
    let userRole = 'anonymous';
    let isBetaTester = false;

    const db = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Get role + beta status
    if (userId) {
      const { data: profile } = await db
        .from('profiles')
        .select('role, display_name')
        .eq('id', userId)
        .maybeSingle();
      if (profile) userRole = profile.role;

      const { data: bt } = await db
        .from('beta_testers')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      isBetaTester = !!bt;
    }

    const { errors } = await req.json();
    if (!errors || !Array.isArray(errors) || errors.length === 0) {
      return new Response(JSON.stringify({ ok: true, inserted: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const thirtyMinAgo = new Date(Date.now() - 30 * 60_000).toISOString();
    let inserted = 0;

    for (const err of errors.slice(0, 10)) {
      const msg = String(err.error_message || '').slice(0, 500);
      if (!msg) continue;

      // Dedup: skip if same error message from same user in last 30 min
      if (userId) {
        const { data: existing } = await db
          .from('platform_errors')
          .select('id')
          .eq('user_id', userId)
          .eq('error_message', msg)
          .gte('created_at', thirtyMinAgo)
          .limit(1);
        if (existing && existing.length > 0) continue;
      }

      await db.from('platform_errors').insert({
        user_id: userId,
        user_role: userRole,
        is_beta_tester: isBetaTester,
        error_message: msg,
        error_stack: String(err.error_stack || '').slice(0, 500) || null,
        page_path: err.page_path || null,
        browser: err.browser || null,
        device_type: err.device_type || null,
      });
      inserted++;

      // Admin notification for critical pages
      const pagePath = err.page_path || '/unknown';
      if (CRITICAL_PAGES.some((p) => pagePath.startsWith(p))) {
        const { data: admins } = await db
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin');

        if (admins) {
          for (const admin of admins) {
            // Dedup admin notifications too
            const { data: existingNotif } = await db
              .from('admin_notifications')
              .select('id')
              .eq('admin_id', admin.user_id)
              .eq('notification_type', 'platform_error')
              .eq('is_read', false)
              .gte('created_at', thirtyMinAgo)
              .limit(1);

            if (existingNotif && existingNotif.length > 0) continue;

            await db.from('admin_notifications').insert({
              admin_id: admin.user_id,
              title: 'Platform Error Detected',
              body: `${userRole} user encountered error on ${pagePath}: ${msg.slice(0, 150)}`,
              notification_type: 'platform_error',
              is_read: false,
              metadata: {
                user_id: userId,
                user_role: userRole,
                page_path: pagePath,
                error_message: msg,
                is_beta_tester: isBetaTester,
              },
            });
          }
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, inserted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('track-error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
