// Trigger: Admin beta requests panel
// Auth: JWT required, admin role
// Rate limit: none
// Side effects: Updates request, creates invite, optionally creates beta_tester, sends email, tracks referral

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

    // AUTO-CREATE beta_testers if user already has an account
    let testerCreated = false;
    const { data: authUsers } = await db.auth.admin.listUsers();
    const existingUser = authUsers?.users?.find(
      (u: unknown) => u.email?.toLowerCase() === request.email.toLowerCase(),
    );

    if (existingUser) {
      // Check if beta_testers row already exists
      const { data: existingTester } = await db
        .from('beta_testers')
        .select('id')
        .eq('user_id', existingUser.id)
        .maybeSingle();

      if (!existingTester) {
        // Insert beta_testers row
        const { data: newTester } = await db.from('beta_testers').insert({
          user_id: existingUser.id,
          tester_type: request.tester_type,
          current_level: 'Explorer',
          points_earned: 0,
          first_login_shown: false,
          session_count: 0,
          joined_at: new Date().toISOString(),
        }).select().single();

        if (newTester) {
          testerCreated = true;

          // Seed task completions
          const { data: tasks } = await db
            .from('beta_tasks')
            .select('id')
            .eq('tester_type', request.tester_type);

          if (tasks && tasks.length > 0) {
            await db.from('beta_task_completions').insert(
              tasks.map((t: unknown) => ({
                tester_id: newTester.id,
                task_id: t.id,
                status: 'pending',
              })),
            );

            // Update tasks_total
            await db.from('beta_testers').update({
              tasks_total: tasks.length,
            }).eq('id', newTester.id);
          }

          // Update beta_config counter
          const { data: currentConfig } = await db
            .from('beta_config')
            .select('current_testers')
            .eq('id', 1)
            .single();
          await db.from('beta_config').update({
            current_testers: (currentConfig?.current_testers ?? 0) + 1,
          }).eq('id', 1);
        }
      }
    }

    // Send email if possible
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (invite && resendKey) {
      const inviteUrl =
        `https://independentminds.org/beta/accept?token=${invite.token}`;

      // Get user's display name if they exist
      const displayName = request.name;

      const emailHtml = testerCreated
        ? buildWelcomeMissionEmail(displayName)
        : buildInviteEmail(displayName, inviteUrl);

      const subject = testerCreated
        ? "Your Beta Mission Awaits! 🚀"
        : "You're approved to test Independent Minds EDU!";

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Independent Minds EDU <notify@independentminds.org>',
          to: [request.email],
          subject,
          html: emailHtml,
        }),
      });
      await db.from('beta_invite_logs').insert({
        invite_id: invite.id, channel: 'email', status: 'sent',
      });
    }

    return new Response(JSON.stringify({ success: true, testerCreated }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .slice(0, 200);
}

function buildInviteEmail(name: string, inviteUrl: string): string {
  const safeName = escapeHtml(name);
  return `<p>Hi ${safeName},</p>
    <p>Your beta request has been approved!</p>
    <p><a href="${inviteUrl}">Accept your invitation</a></p>
    <p>This link expires in 14 days.</p>`;
}

function buildWelcomeMissionEmail(name: string): string {
  return `
  <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 32px;">
    <div style="background: #1A365D; border-radius: 12px; padding: 24px; color: white; text-align: center;">
      <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 600;">Your Beta Mission Awaits! 🚀</h1>
      <p style="margin: 0; opacity: 0.8; font-size: 14px;">You're one of our first testers. Let's get started.</p>
    </div>

    <div style="background: white; border-radius: 12px; padding: 24px; margin-top: 16px;">
      <p style="margin: 0 0 16px; font-size: 16px;">Hi ${escapeHtml(name)},</p>
      <p style="margin: 0 0 16px; font-size: 14px; color: #555;">
        Welcome to the Independent Minds EDU beta! Complete these tasks to earn points and level up:
      </p>

      <div style="margin: 16px 0;">
        <p style="font-weight: 600; margin: 0 0 12px; font-size: 14px;">Your Tasks:</p>

        <div style="background: #FFF8E7; border: 1px solid #BA7517; border-radius: 8px; padding: 12px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="background: #BA7517; color: white; border-radius: 50%; width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold;">1</span>
            <span style="font-size: 13px;">Set up first student — <strong>25 pts</strong></span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="background: #BA7517; color: white; border-radius: 50%; width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold;">2</span>
            <span style="font-size: 13px;">Build weekly schedule — <strong>25 pts</strong></span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="background: #BA7517; color: white; border-radius: 50%; width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold;">3</span>
            <span style="font-size: 13px;">Connect notifications — <strong>25 pts</strong></span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="background: #BA7517; color: white; border-radius: 50%; width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold;">4</span>
            <span style="font-size: 13px;">Create a reward — <strong>25 pts</strong></span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="background: #BA7517; color: white; border-radius: 50%; width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold;">5</span>
            <span style="font-size: 13px;">Invite a co-guardian — <strong>25 pts</strong></span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="background: #BA7517; color: white; border-radius: 50%; width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold;">6</span>
            <span style="font-size: 13px;">Read one message — <strong>25 pts</strong></span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="background: #BA7517; color: white; border-radius: 50%; width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold;">7</span>
            <span style="font-size: 13px;">Download PDF report — <strong>25 pts</strong></span>
          </div>
        </div>
      </div>

      <div style="background: #f0f4f8; border-radius: 8px; padding: 12px; margin: 16px 0;">
        <p style="margin: 0; font-size: 12px; color: #666; text-align: center;">
          <strong>Level Progression:</strong><br/>
          Explorer (0–50) → Tester (51–200) → Contributor (201–350) → <span style="color: #BA7517;">Champion (350+)</span>
        </p>
      </div>

      <div style="text-align: center; margin-top: 24px;">
        <a href="https://independentminds.org" style="background: #1D9E75; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
          Start My Mission →
        </a>
      </div>
    </div>

    <p style="text-align: center; color: #999; font-size: 11px; margin-top: 16px;">
      Independent Minds EDU — Built with Love by KòdLabo
    </p>
  </div>`;
}
