// Trigger: Client POST from notification settings wizard
// Auth: JWT required
// Rate limit: none (lightweight)
// Side effects: Creates telegram_link_tokens row, sets webhook

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
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const botUsername = Deno.env.get('TELEGRAM_BOT_USERNAME');

    if (!botToken || !botUsername) {
      return new Response(
        JSON.stringify({ error: 'Telegram bot not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Verify JWT
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

    const { action } = await req.json();

    if (action === 'generate') {
      // Generate a random 32-char hex token
      const tokenBytes = new Uint8Array(16);
      crypto.getRandomValues(tokenBytes);
      const token = Array.from(tokenBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      // Invalidate any existing tokens for this user
      await db
        .from('telegram_link_tokens')
        .update({ used: true })
        .eq('user_id', user.id)
        .eq('used', false);

      // Insert new token
      const { error: insertErr } = await db
        .from('telegram_link_tokens')
        .insert({
          user_id: user.id,
          token,
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        });

      if (insertErr) {
        return new Response(JSON.stringify({ error: insertErr.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Ensure webhook is set for the bot
      const webhookUrl = `${supabaseUrl}/functions/v1/beta-telegram-webhook`;
      await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl }),
      });

      const deepLink = `https://t.me/${botUsername}?start=link_${token}`;

      return new Response(
        JSON.stringify({ ok: true, deep_link: deepLink, token }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (action === 'check') {
      // Check if any token for this user has been linked
      const { data: linked } = await db
        .from('telegram_link_tokens')
        .select('chat_id')
        .eq('user_id', user.id)
        .eq('used', false)
        .not('chat_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (linked?.chat_id) {
        // Save chat_id to parent_settings and mark token used
        await db
          .from('parent_settings')
          .upsert(
            {
              user_id: user.id,
              telegram_chat_id: String(linked.chat_id),
              telegram_bot_token: botToken,
              notification_channel: 'telegram',
            },
            { onConflict: 'user_id' },
          );

        await db
          .from('telegram_link_tokens')
          .update({ used: true })
          .eq('user_id', user.id)
          .not('chat_id', 'is', null);

        return new Response(
          JSON.stringify({ ok: true, linked: true, chat_id: String(linked.chat_id) }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      return new Response(
        JSON.stringify({ ok: true, linked: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    console.error('telegram-link error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
