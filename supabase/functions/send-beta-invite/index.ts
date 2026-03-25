// Trigger: Admin panel invite form
// Auth: JWT required, admin role verified
// Rate limit: none (admin only)
// Side effects: Creates invite, logs delivery as 'copy'

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

    const db = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });
    const { data: isAdmin } = await db.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin',
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { name, email, tester_type, language = 'en', notes } = body;

    if (!name || !email || !tester_type) {
      return new Response(
        JSON.stringify({ error: 'name, email, tester_type required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: invite, error: invErr } = await db
      .from('beta_invites')
      .insert({ email, tester_type, invited_by: user.id, language, notes })
      .select()
      .single();
    if (invErr) throw invErr;

    const baseUrl =
      `https://independentmindsedu.com/beta/accept?token=${invite.token}`;
    const inviteUrl = notes
      ? `${baseUrl}&msg=${encodeURIComponent(notes)}`
      : baseUrl;

    await db.from('beta_invite_logs').insert({
      invite_id: invite.id, channel: 'copy', status: 'copied',
    });

    return new Response(JSON.stringify({
      success: true, invite_url: inviteUrl,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
