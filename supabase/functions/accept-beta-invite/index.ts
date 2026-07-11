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

    // Get tasks for this tester type (with title + description for email)
    const { data: tasks } = await db
      .from('beta_tasks')
      .select('id, title_key, description_key, task_order')
      .eq('tester_type', invite.tester_type)
      .order('task_order', { ascending: true });

    const taskCount = tasks?.length ?? 0;

    // Create tester
    const { data: tester, error: testerErr } = await db
      .from('beta_testers')
      .insert({
        user_id: user.id,
        tester_type: invite.tester_type,
        tasks_total: taskCount,
        beta_phase: config ? 'active' : 'closed',
        points_earned: 0,
        current_level: 'Explorer',
        first_login_shown: false,
      })
      .select()
      .single();

    if (testerErr) throw testerErr;

    // Create task completions
    if (tasks && tasks.length > 0) {
      const completions = tasks.map((t: unknown) => ({
        tester_id: tester.id,
        task_id: t.id,
        status: 'pending',
      }));
      await db.from('beta_task_completions').insert(completions);
    }

    // Send welcome email
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const emailGatewayApiKey = Deno.env.get('EMAIL_GATEWAY_API_KEY');
    const { data: authUser } = await db.auth.admin.getUserById(user.id);
    const userEmail = authUser?.user?.email;
    const { data: userProfile } = await db.from('profiles').select('display_name').eq('id', user.id).single();
    const displayName = userProfile?.display_name || 'Beta Tester';

    if (resendApiKey && emailGatewayApiKey && userEmail && tasks && tasks.length > 0) {
      const taskListHtml = tasks.map((t: unknown) => `
        <tr>
          <td style="padding:12px 16px;border-left:3px solid #BA7517;background:#FFFBF0;margin-bottom:8px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="display:inline-block;width:28px;height:28px;border-radius:50%;background:#BA7517;color:white;text-align:center;line-height:28px;font-weight:bold;font-size:12px;margin-right:8px;">${String(t.task_order).padStart(2, '0')}</span>
                  <strong style="color:#1A365D;">${t.title_key}</strong>
                </td>
                <td style="text-align:right;">
                  <span style="background:#FEF3C7;color:#92400E;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:bold;">25 pts</span>
                </td>
              </tr>
              <tr>
                <td colspan="2" style="padding-top:4px;color:#64748B;font-size:13px;">${t.description_key}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="height:8px;"></td></tr>
      `).join('');

      const welcomeHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:white;">
  <tr>
    <td style="background:#1A365D;padding:32px 24px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:22px;">Welcome to Independent Minds EDU Beta, ${displayName}!</h1>
    </td>
  </tr>
  <tr>
    <td style="padding:24px;">
      <div style="background:#FFFBF0;border:1px solid #BA7517;border-radius:12px;padding:20px;text-align:center;">
        <p style="color:#92400E;font-size:15px;margin:0;line-height:1.6;">
          You have been selected as a Beta Tester. Your mission: complete <strong>${taskCount} tasks</strong> and become a <strong>Beta Champion</strong>. Each task earns you <strong>25 points</strong>.
        </p>
      </div>
    </td>
  </tr>
  <tr>
    <td style="padding:0 24px 16px;">
      <h2 style="color:#1A365D;font-size:16px;margin:0 0 12px;">Your Tasks:</h2>
      <table width="100%" cellpadding="0" cellspacing="0">${taskListHtml}</table>
    </td>
  </tr>
  <tr>
    <td style="padding:16px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;border-radius:8px;">
        <tr>
          <td style="padding:12px;text-align:center;font-size:13px;">
            <span style="color:#085041;background:#E1F5EE;padding:4px 10px;border-radius:12px;margin:0 4px;">Explorer</span>
            <span style="color:#999;">→</span>
            <span style="color:white;background:#1D9E75;padding:4px 10px;border-radius:12px;margin:0 4px;">Tester</span>
            <span style="color:#999;">→</span>
            <span style="color:#3C3489;background:#EEEDFE;padding:4px 10px;border-radius:12px;margin:0 4px;">Contributor</span>
            <span style="color:#999;">→</span>
            <span style="color:#633806;background:#FAEEDA;padding:4px 10px;border-radius:12px;margin:0 4px;">🏆 Champion</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:24px;text-align:center;">
      <a href="https://www.independentmindsedu.org" style="display:inline-block;background:#1D9E75;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">Start My Mission →</a>
    </td>
  </tr>
  <tr>
    <td style="background:#F8FAFC;padding:24px;text-align:center;border-top:1px solid #E2E8F0;">
      <p style="color:#64748B;font-size:13px;line-height:1.6;margin:0;">Thank you for helping us build Independent Minds EDU.</p>
    </td>
  </tr>
</table>
</body>
</html>`;

      const emailGatewayUrl = Deno.env.get('EMAIL_GATEWAY_URL');
      if (!emailGatewayUrl) {
        throw new Error('EMAIL_GATEWAY_URL not configured');
      }

      await fetch(`${emailGatewayUrl}/emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${emailGatewayApiKey}`,
          'X-Connection-Api-Key': resendApiKey,
        },
        body: JSON.stringify({
          from: 'Independent Minds EDU <onboarding@resend.dev>',
          to: [userEmail],
          subject: 'Welcome to the Beta — Your Mission Starts Now!',
          html: welcomeHtml,
        }),
      });
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

    // Award referral points: find pending referrals for this invite's email
    const { data: pendingReferrals } = await db
      .from('beta_referrals')
      .select('id, referrer_tester_id, points_awarded')
      .eq('status', 'pending')
      .eq('referred_tester_id', tester.id);

    // Also check by request that led to this invite
    const { data: requestReferrals } = await db
      .from('beta_referrals')
      .select('id, referrer_tester_id, points_awarded')
      .eq('status', 'pending')
      .is('referred_tester_id', null);

    // Link referrals to new tester and award points
    for (const ref of [...(pendingReferrals ?? []), ...(requestReferrals ?? [])]) {
      // Get the referrer's user_id to find their student
      const { data: referrerTester } = await db
        .from('beta_testers')
        .select('user_id')
        .eq('id', ref.referrer_tester_id)
        .maybeSingle();

      if (referrerTester?.user_id) {
        // Find referrer's student to award points
        const { data: referrerStudent } = await db
          .from('students')
          .select('student_id')
          .eq('parent_id', referrerTester.user_id)
          .limit(1)
          .maybeSingle();

        if (referrerStudent) {
          // Award points via direct insert (service role bypasses RLS)
          await db.from('reward_points').insert({
            student_id: referrerStudent.student_id,
            points: ref.points_awarded,
            reason: 'Beta referral reward',
            source: 'referral',
          });
        }
      }

      // Update referral status
      await db.from('beta_referrals')
        .update({
          referred_tester_id: tester.id,
          status: 'awarded',
          awarded_at: new Date().toISOString(),
        })
        .eq('id', ref.id);
    }

    return new Response(JSON.stringify({
      success: true, tester_type: invite.tester_type,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
