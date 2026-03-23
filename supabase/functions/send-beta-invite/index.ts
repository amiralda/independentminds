// Trigger: Admin panel invite form
// Auth: JWT required, admin role verified
// Rate limit: none (admin only)
// Side effects: Creates invite, sends via channels, logs delivery

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
    const {
      name, email, phone, tester_type,
      language = 'en', notes,
      channels = [] as string[],
      copy_only = false,
    } = body;

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

    const inviteUrl =
      `https://independentmindsedu.com/beta/accept?token=${invite.token}`;
    const botUsername = Deno.env.get('TELEGRAM_BOT_USERNAME');
    const telegramDeepLink = botUsername
      ? `https://t.me/${botUsername}?start=beta_${invite.token}`
      : null;

    if (copy_only) {
      await db.from('beta_invite_logs').insert({
        invite_id: invite.id, channel: 'copy', status: 'copied',
      });
      return new Response(JSON.stringify({
        success: true, invite_url: inviteUrl, telegram_deep_link: telegramDeepLink,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const channelsSent: string[] = [];
    const channelsFailed: string[] = [];

    const logResult = async (
      ch: string, ok: boolean, errMsg?: string,
    ) => {
      await db.from('beta_invite_logs').insert({
        invite_id: invite.id, channel: ch,
        status: ok ? 'sent' : 'failed',
        error_message: errMsg ?? null,
      });
      ok ? channelsSent.push(ch) : channelsFailed.push(ch);
    };

    // EMAIL
    if (channels.includes('email')) {
      try {
        const resendKey = Deno.env.get('RESEND_API_KEY');
        if (!resendKey) throw new Error('RESEND_API_KEY not set');
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Independent Minds EDU <noreply@independentmindsedu.com>',
            to: [email],
            subject: "You're invited to test Independent Minds EDU",
            html: `<p>Hi ${name},</p>
              <p>You're invited to test as a <strong>${tester_type}</strong>.</p>
              ${notes ? `<p>${notes}</p>` : ''}
              <p><a href="${inviteUrl}">Accept your invitation</a></p>
              <p>This link expires in 14 days.</p>`,
          }),
        });
        if (!res.ok) throw new Error(`Resend ${res.status}`);
        await logResult('email', true);
      } catch (e: any) {
        await logResult('email', false, e.message);
      }
    }

    // SMS
    if (channels.includes('sms')) {
      try {
        const sid = Deno.env.get('twilioSID');
        const secret = Deno.env.get('twilioSecret');
        const from = Deno.env.get('TWILIO_SMS_FROM');
        if (!sid || !secret || !from || !phone) {
          throw new Error('Twilio SMS not configured or phone missing');
        }
        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              Authorization: 'Basic ' + btoa(`${sid}:${secret}`),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              From: from, To: phone,
              Body: `Invited to test Independent Minds EDU! ${inviteUrl}`,
            }),
          },
        );
        if (!res.ok) throw new Error(`Twilio SMS ${res.status}`);
        await logResult('sms', true);
      } catch (e: any) {
        await logResult('sms', false, e.message);
      }
    }

    // WHATSAPP
    if (channels.includes('whatsapp')) {
      try {
        const sid = Deno.env.get('twilioSID');
        const secret = Deno.env.get('twilioSecret');
        const waFrom = Deno.env.get('TWILIO_WHATSAPP_FROM');
        if (!sid || !secret || !waFrom || !phone) {
          throw new Error('WhatsApp not configured or phone missing');
        }
        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              Authorization: 'Basic ' + btoa(`${sid}:${secret}`),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              From: waFrom, To: `whatsapp:${phone}`,
              Body: `Hi ${name}! You're invited to test *Independent Minds EDU*. ${notes || ''}\nAccept: ${inviteUrl}\nExpires in 14 days.`,
            }),
          },
        );
        if (!res.ok) throw new Error(`WhatsApp ${res.status}`);
        await logResult('whatsapp', true);
      } catch (e: any) {
        await logResult('whatsapp', false, e.message);
      }
    }

    // TELEGRAM (deep link only)
    if (channels.includes('telegram')) {
      if (telegramDeepLink) {
        await logResult('telegram', true);
      } else {
        await logResult('telegram', false, 'TELEGRAM_BOT_USERNAME not set');
      }
    }

    return new Response(JSON.stringify({
      success: true, invite_url: inviteUrl,
      telegram_deep_link: telegramDeepLink,
      channels_sent: channelsSent, channels_failed: channelsFailed,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
