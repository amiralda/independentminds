// Trigger: Manual or cron — sends progress emails to active beta testers
// Auth: CRON_SECRET header required
// Rate limit: none (admin-triggered)
// Side effects: Sends emails via Resend

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

function buildProgressEmail(data: {
  displayName: string;
  tasksCompleted: number;
  totalTasks: number;
  pointsEarned: number;
  currentLevel: string;
  remainingTasks: { order: number; title: string; description: string }[];
}) {
  const { displayName, tasksCompleted, totalTasks, pointsEarned, currentLevel, remainingTasks } = data;
  const percent = totalTasks > 0 ? Math.round((tasksCompleted / totalTasks) * 100) : 0;
  const remaining = remainingTasks.length;

  let motivation = '';
  if (remaining === 1) {
    motivation = "You're almost there! One more task and you become a Beta Champion.";
  } else if (remaining <= 3) {
    motivation = "You're so close! Complete these last tasks to unlock Beta Champion status.";
  } else {
    motivation = "You're making great progress! Keep going — Beta Champion is waiting for you.";
  }

  const taskListHtml = remainingTasks.map(t => `
    <tr>
      <td style="padding:12px 16px;border-left:3px solid #BA7517;background:#FFFBF0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <span style="display:inline-block;width:28px;height:28px;border-radius:50%;background:#BA7517;color:white;text-align:center;line-height:28px;font-weight:bold;font-size:12px;margin-right:8px;">${String(t.order).padStart(2, '0')}</span>
              <strong style="color:#1A365D;">${t.title}</strong>
            </td>
            <td style="text-align:right;">
              <span style="background:#FEF3C7;color:#92400E;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:bold;">25 pts</span>
            </td>
          </tr>
          <tr>
            <td colspan="2" style="padding-top:4px;color:#64748B;font-size:13px;">
              ${t.description}
            </td>
          </tr>
          <tr>
            <td colspan="2" style="padding-top:8px;">
              <a href="https://independentmindsedu.com" style="color:#BA7517;font-weight:bold;text-decoration:none;font-size:13px;">→ Do this now</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr><td style="height:8px;"></td></tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:white;">
  <!-- Header -->
  <tr>
    <td style="background:#1A365D;padding:32px 24px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:24px;">Beta Mission Update</h1>
      <p style="color:rgba(255,255,255,0.7);margin:8px 0 0;font-size:14px;">Independent Minds EDU</p>
    </td>
  </tr>
  <!-- Greeting -->
  <tr>
    <td style="padding:24px 24px 8px;">
      <p style="color:#1A365D;font-size:16px;">Hi ${displayName},</p>
    </td>
  </tr>
  <!-- Progress Section -->
  <tr>
    <td style="padding:8px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;border-radius:12px;padding:20px;">
        <tr>
          <td style="text-align:center;padding:20px;">
            <!-- Progress ring approximation -->
            <div style="display:inline-block;width:80px;height:80px;border-radius:50%;border:6px solid #E2E8F0;position:relative;">
              <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:20px;font-weight:bold;color:#1D9E75;">${tasksCompleted}/${totalTasks}</div>
            </div>
            <p style="margin:12px 0 4px;font-size:14px;color:#64748B;">Tasks completed</p>
            <table cellpadding="0" cellspacing="0" style="margin:12px auto 0;">
              <tr>
                <td style="padding-right:12px;">
                  <span style="background:#E1F5EE;color:#085041;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:bold;">${currentLevel}</span>
                </td>
                <td>
                  <span style="background:#FEF3C7;color:#92400E;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:bold;">★ ${pointsEarned} pts</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <!-- Motivation -->
  <tr>
    <td style="padding:16px 24px;">
      <p style="color:#1A365D;font-size:15px;line-height:1.5;font-style:italic;">${motivation}</p>
    </td>
  </tr>
  <!-- Tasks Remaining -->
  <tr>
    <td style="padding:8px 24px;">
      <h2 style="color:#BA7517;font-size:16px;margin:0 0 12px;">Here's what's left for you to do:</h2>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${taskListHtml}
      </table>
    </td>
  </tr>
  <!-- CTA -->
  <tr>
    <td style="padding:24px;text-align:center;">
      <a href="https://independentmindsedu.com" style="display:inline-block;background:#1D9E75;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">Continue My Mission →</a>
    </td>
  </tr>
  <!-- Footer -->
  <tr>
    <td style="background:#F8FAFC;padding:24px;text-align:center;border-top:1px solid #E2E8F0;">
      <p style="color:#64748B;font-size:13px;line-height:1.6;margin:0;">
        Thank you for helping us build Independent Minds EDU.<br>
        Your feedback is shaping the future of education for diaspora families worldwide.
      </p>
    </td>
  </tr>
</table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const cronSecret = Deno.env.get('CRON_SECRET');
    const headerSecret = req.headers.get('x-cron-secret');
    if (!cronSecret || headerSecret !== cronSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const db = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Get all testers with user info
    const { data: testers, error: tErr } = await db
      .from('beta_testers')
      .select('id, user_id, tester_type');
    if (tErr) throw tErr;
    if (!testers || testers.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No testers found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sentTo: string[] = [];

    for (const tester of testers) {
      // Get user email + profile
      const { data: profile } = await db
        .from('profiles')
        .select('display_name')
        .eq('id', tester.user_id)
        .single();

      const { data: authUser } = await db.auth.admin.getUserById(tester.user_id);
      const email = authUser?.user?.email;
      if (!email || !profile) continue;

      // Get tasks
      const { data: tasks } = await db
        .from('beta_tasks')
        .select('id, title_key, description_key, task_order')
        .eq('tester_type', tester.tester_type)
        .order('task_order', { ascending: true });

      // Get completions
      const { data: completions } = await db
        .from('beta_task_completions')
        .select('task_id, status')
        .eq('tester_id', tester.id);

      const completedIds = new Set(
        (completions ?? []).filter((c: unknown) => c.status === 'completed').map((c: unknown) => c.task_id)
      );

      const totalTasks = tasks?.length ?? 0;
      const tasksCompleted = completedIds.size;
      const remaining = totalTasks - tasksCompleted;

      // Skip testers who completed all tasks
      if (remaining === 0) continue;

      const pointsEarned = tasksCompleted * 25;
      let currentLevel = 'Explorer';
      if (pointsEarned > 350) currentLevel = 'Beta Champion';
      else if (pointsEarned > 200) currentLevel = 'Contributor';
      else if (pointsEarned > 50) currentLevel = 'Tester';

      const remainingTasks = (tasks ?? [])
        .filter((t: unknown) => !completedIds.has(t.id))
        .map((t: unknown) => ({
          order: t.task_order,
          title: t.title_key.split('.').pop() || t.title_key,
          description: t.description_key,
        }));

      // Update tester record
      await db.from('beta_testers').update({
        points_earned: pointsEarned,
        current_level: currentLevel,
      }).eq('id', tester.id);

      const html = buildProgressEmail({
        displayName: profile.display_name,
        tasksCompleted,
        totalTasks,
        pointsEarned,
        currentLevel,
        remainingTasks,
      });

      // Send via Resend through connector gateway
      const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend';
      await fetch(`${GATEWAY_URL}/emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${lovableApiKey}`,
          'X-Connection-Api-Key': resendApiKey,
        },
        body: JSON.stringify({
          from: 'Independent Minds EDU <onboarding@resend.dev>',
          to: [email],
          subject: `Your Beta Mission Progress — ${remaining} tasks left!`,
          html,
        }),
      });

      sentTo.push(email);
    }

    return new Response(JSON.stringify({
      sent: sentTo.length,
      recipients: sentTo,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
