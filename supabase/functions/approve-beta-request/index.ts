// Trigger: Admin beta requests panel
// Auth: JWT required, admin role
// Rate limit: none
// Side effects: Updates request, creates invite, optionally sends email, tracks referral

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
      _user_id: user.id, _role: 'admin',
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { request_id } = await req.json();
    if (!request_id) {
      return new Response(JSON.stringify({ error: 'request_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get request
    const { data: request, error: reqErr } = await db
      .from('beta_requests')
      .select('*')
      .eq('id', request_id)
      .single();
    if (reqErr || !request) {
      return new Response(JSON.stringify({ error: 'Request not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update request
    await db.from('beta_requests').update({
      status: 'approved',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', request_id);

    // Create invite
    const { data: invite } = await db.from('beta_invites').insert({
      email: request.email,
      tester_type: request.tester_type,
      invited_by: user.id,
      language: request.language ?? 'en',
    }).select().single();

    // Track referral if applicable
    if (request.referred_by_code) {
      const { data: referrer } = await db
        .from('beta_testers')
        .select('id')
        .eq('referral_code', request.referred_by_code)
        .maybeSingle();

      if (referrer) {
        await db.from('beta_referrals').insert({
          referrer_tester_id: referrer.id,
          referred_request_id: request.id,
          points_awarded: 50,
          status: 'pending',
        });
      }
    }

    // Send email if possible
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (invite && resendKey) {
      const inviteUrl =
        `https://independentmindsedu.com/beta/accept?token=${invite.token}`;
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Independent Minds EDU <noreply@independentmindsedu.com>',
          to: [request.email],
          subject: "You're approved to test Independent Minds EDU!",
          html: `<p>Hi ${request.name},</p>
            <p>Your beta request has been approved!</p>
            <p><a href="${inviteUrl}">Accept your invitation</a></p>
            <p>This link expires in 14 days.</p>`,
        }),
      });
      await db.from('beta_invite_logs').insert({
        invite_id: invite.id, channel: 'email', status: 'sent',
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
