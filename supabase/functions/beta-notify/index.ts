// Trigger: Admin beta panel "Send welcome emails" or "Notify beta testers"
// Auth: JWT required, admin role
// Rate limit: none
// Side effects: Sends emails, inserts inbox_messages

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

    const { action, title, body } = await req.json();

    if (action === 'welcome_mission') {
      return await sendWelcomeMission(db);
    } else if (action === 'notify_update') {
      return await notifyUpdate(db, title, body);
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function sendWelcomeMission(db: unknown) {
  // Find testers with 0 points (haven't started)
  const { data: testers } = await db
    .from('beta_testers')
    .select('id, user_id, tester_type, points_earned')
    .eq('points_earned', 0);

  if (!testers || testers.length === 0) {
    return new Response(JSON.stringify({ sent: 0, message: 'No eligible testers' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const resendKey = Deno.env.get('RESEND_API_KEY');
  let sentCount = 0;
  const results: unknown[] = [];

  for (const tester of testers) {
    // Get profile and email
    const { data: profile } = await db
      .from('profiles')
      .select('display_name')
      .eq('id', tester.user_id)
      .single();

    if (!profile || profile.display_name === 'Dad') continue;

    const { data: authUser } = await db.auth.admin.getUserById(tester.user_id);
    if (!authUser?.user?.email) continue;

    const name = profile.display_name;
    const email = authUser.user.email;

    // Send email
    if (resendKey) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Independent Minds EDU <notify@independentminds.org>',
            to: [email],
            subject: 'Your Beta Mission Awaits! 🚀',
            html: buildWelcomeMissionEmail(name),
          }),
        });
        sentCount++;
        results.push({ name, email, status: 'sent' });
      } catch (e: unknown) {
        results.push({ name, email, status: 'error', error: e.message });
      }
    }
  }

  return new Response(JSON.stringify({ sent: sentCount, results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function notifyUpdate(db: unknown, title?: string, body?: string) {
  const notifTitle = title || 'New update available!';
  const notifBody = body || "You are among the first to experience the latest version of Independent Minds EDU. Explore what's new and let us know what you think!";

  // Get all beta testers with their parent_ids and student_ids
  const { data: testers } = await db
    .from('beta_testers')
    .select('id, user_id');

  if (!testers || testers.length === 0) {
    return new Response(JSON.stringify({ sent: 0, message: 'No beta testers' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let sentCount = 0;

  for (const tester of testers) {
    // Get a student_id for this user (needed for inbox_messages)
    const { data: students } = await db
      .from('students')
      .select('student_id')
      .eq('parent_id', tester.user_id)
      .limit(1);

    const studentId = students?.[0]?.student_id;
    if (!studentId) continue;

    await db.from('inbox_messages').insert({
      parent_id: tester.user_id,
      student_id: studentId,
      message_type: 'admin_broadcast',
      title: notifTitle,
      body: notifBody,
      is_read: false,
    });
    sentCount++;
  }

  return new Response(JSON.stringify({ sent: sentCount }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function buildWelcomeMissionEmail(name: string): string {
  return `
  <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 32px;">
    <div style="background: #1A365D; border-radius: 12px; padding: 24px; color: white; text-align: center;">
      <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 600;">Your Beta Mission Awaits! 🚀</h1>
      <p style="margin: 0; opacity: 0.8; font-size: 14px;">You're one of our first testers. Let's get started.</p>
    </div>
    <div style="background: white; border-radius: 12px; padding: 24px; margin-top: 16px;">
      <p style="margin: 0 0 16px; font-size: 16px;">Hi ${name},</p>
      <p style="margin: 0 0 16px; font-size: 14px; color: #555;">
        Welcome to the Independent Minds EDU beta! Complete these tasks to earn points and level up:
      </p>
      <div style="background: #FFF8E7; border: 1px solid #BA7517; border-radius: 8px; padding: 12px; margin: 16px 0;">
        ${[
          'Set up first student',
          'Build weekly schedule',
          'Connect notifications',
          'Create a reward',
          'Invite a co-guardian',
          'Read one message',
          'Download PDF report',
        ].map((task, i) => `
          <div style="display: flex; align-items: center; gap: 8px; ${i < 6 ? 'margin-bottom: 8px;' : ''}">
            <span style="background: #BA7517; color: white; border-radius: 50%; width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold;">${i + 1}</span>
            <span style="font-size: 13px;">${task} — <strong>25 pts</strong></span>
          </div>
        `).join('')}
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
