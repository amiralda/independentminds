// Trigger: Telegram webhook (bot receives /start command)
// Auth: No JWT (Telegram sends POST directly)
// Rate limit: none
// Side effects: Stores chat_id, replies with invite URL

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

  // Verify request originated from Telegram by checking the secret header set
  // when registering the webhook via setWebhook?secret_token=...
  // If TELEGRAM_WEBHOOK_SECRET is configured, the header must match.
  const expectedSecret = Deno.env.get('TELEGRAM_WEBHOOK_SECRET');
  if (expectedSecret) {
    const incomingSecret = req.headers.get('X-Telegram-Bot-Api-Secret-Token');
    if (incomingSecret !== expectedSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  try {
    const body = await req.json();
    const message = body.message;
    if (!message?.text) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();

    // Handle /start link_{token} — parent notification linking
    if (text.startsWith('/start link_')) {
      const linkToken = text.replace('/start link_', '').trim();
      if (linkToken) {
        const db = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
          { auth: { persistSession: false } },
        );

        // Find the token and save chat_id
        const { data: tokenRow } = await db
          .from('telegram_link_tokens')
          .select('id, user_id')
          .eq('token', linkToken)
          .eq('used', false)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
        if (tokenRow && botToken) {
          await db
            .from('telegram_link_tokens')
            .update({ chat_id: chatId })
            .eq('id', tokenRow.id);

          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: '✅ Connected! You will now receive notifications about your students\' progress here.',
            }),
          });
        } else if (botToken) {
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: 'This link has expired or is invalid. Please generate a new one from your notification settings.',
            }),
          });
        }
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle /start beta_{token}
    if (!text.startsWith('/start beta_')) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = text.replace('/start beta_', '');
    if (!token) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    );

    // Look up invite
    const { data: invite } = await db
      .from('beta_invites')
      .select('id, token, status')
      .eq('token', token)
      .maybeSingle();

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      console.error('TELEGRAM_BOT_TOKEN not set');
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!invite) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: 'Sorry, this invitation link is invalid or has expired.',
        }),
      });
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Store chat_id
    await db.from('beta_invites')
      .update({ telegram_chat_id: String(chatId) })
      .eq('id', invite.id);

    const inviteUrl =
      `https://independentminds.org/beta/accept?token=${invite.token}`;

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `Your Independent Minds EDU beta invitation is ready.\n\nTap here to accept: ${inviteUrl}`,
        parse_mode: 'HTML',
      }),
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    console.error('Webhook error:', err.message);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
