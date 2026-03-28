// Trigger: Admin panel invite form
// Auth: JWT required, admin role verified
// Rate limit: none (admin only)
// Side effects: Creates invite, logs delivery per channel

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
      channels = [], copy_only = false,
    } = body;

    if (!name || !tester_type) {
      return new Response(
        JSON.stringify({ error: 'name, tester_type required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!copy_only && channels.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Select at least one channel or copy_only' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Create invite
    const { data: invite, error: invErr } = await db
      .from('beta_invites')
      .insert({
        email: email || `${name.toLowerCase().replace(/\s/g, '.')}@pending`,
        tester_type,
        invited_by: user.id,
        language,
        notes,
      })
      .select()
      .single();
    if (invErr) throw invErr;

    const inviteUrl =
      `https://independentmindsedu.com/beta/accept?token=${invite.token}`;
    const notesShort = (notes || '').slice(0, 80);

    // If copy only, just log and return
    if (copy_only) {
      await db.from('beta_invite_logs').insert({
        invite_id: invite.id, channel: 'copy', status: 'copied',
      });
      return new Response(JSON.stringify({
        success: true, invite_url: inviteUrl,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const channelsSent: string[] = [];
    const channelsFailed: string[] = [];
    let telegramDeepLink: string | null = null;

    // Process each channel — partial success is OK
    for (const channel of channels as string[]) {
      try {
        switch (channel) {
          case 'email': {
            const resendKey = Deno.env.get('RESEND_API_KEY');
            if (!resendKey || !email) {
              channelsFailed.push('email');
              await db.from('beta_invite_logs').insert({
                invite_id: invite.id, channel: 'email', status: 'failed',
                error_message: !email ? 'No email' : 'No RESEND_API_KEY',
              });
              break;
            }
            const emailRes = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'Independent Minds EDU <noreply@independentmindsedu.com>',
                to: [email],
                subject: `You're invited to test Independent Minds EDU`,
                html: `<p>Hi ${name},</p>
<p>You're invited to test as a <strong>${tester_type}</strong>.</p>
${notes ? `<p>${notes}</p>` : ''}
<p><a href="${inviteUrl}">Accept your invitation</a></p>
<p>This link expires in 14 days.</p>`,
              }),
            });
            if (emailRes.ok) {
              channelsSent.push('email');
              await db.from('beta_invite_logs').insert({
                invite_id: invite.id, channel: 'email', status: 'sent',
              });
            } else {
              const errBody = await emailRes.text();
              channelsFailed.push('email');
              await db.from('beta_invite_logs').insert({
                invite_id: invite.id, channel: 'email', status: 'failed',
                error_message: errBody.slice(0, 200),
              });
            }
            break;
          }

          case 'sms': {
            const twilioSid = Deno.env.get('twilioSID');
            const twilioSecret = Deno.env.get('twilioSecret');
            const smsFrom = Deno.env.get('TWILIO_SMS_FROM');
            if (!twilioSid || !twilioSecret || !smsFrom || !phone) {
              channelsFailed.push('sms');
              await db.from('beta_invite_logs').insert({
                invite_id: invite.id, channel: 'sms', status: 'failed',
                error_message: 'Missing Twilio config or phone',
              });
              break;
            }
            const smsBody = `Invited to test Independent Minds EDU! ${notesShort} ${inviteUrl}`.slice(0, 160);
            const smsRes = await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
              {
                method: 'POST',
                headers: {
                  'Authorization': 'Basic ' + btoa(`${twilioSid}:${twilioSecret}`),
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                  To: phone,
                  From: smsFrom,
                  Body: smsBody,
                }),
              },
            );
            if (smsRes.ok) {
              channelsSent.push('sms');
              await db.from('beta_invite_logs').insert({
                invite_id: invite.id, channel: 'sms', status: 'sent',
              });
            } else {
              channelsFailed.push('sms');
              await db.from('beta_invite_logs').insert({
                invite_id: invite.id, channel: 'sms', status: 'failed',
                error_message: (await smsRes.text()).slice(0, 200),
              });
            }
            break;
          }

          case 'whatsapp': {
            const twilioSid = Deno.env.get('twilioSID');
            const twilioSecret = Deno.env.get('twilioSecret');
            const waFrom = Deno.env.get('TWILIO_WHATSAPP_FROM');
            if (!twilioSid || !twilioSecret || !waFrom || !phone) {
              channelsFailed.push('whatsapp');
              await db.from('beta_invite_logs').insert({
                invite_id: invite.id, channel: 'whatsapp', status: 'failed',
                error_message: 'Missing Twilio/WhatsApp config or phone',
              });
              break;
            }
            const waBody = `Hi ${name}! Invited to test *Independent Minds EDU*.\n${notes ? notes + '\n' : ''}Accept: ${inviteUrl}\nExpires 14 days`;
            const waRes = await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
              {
                method: 'POST',
                headers: {
                  'Authorization': 'Basic ' + btoa(`${twilioSid}:${twilioSecret}`),
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                  To: `whatsapp:${phone}`,
                  From: waFrom,
                  Body: waBody,
                }),
              },
            );
            if (waRes.ok) {
              channelsSent.push('whatsapp');
              await db.from('beta_invite_logs').insert({
                invite_id: invite.id, channel: 'whatsapp', status: 'sent',
              });
            } else {
              channelsFailed.push('whatsapp');
              await db.from('beta_invite_logs').insert({
                invite_id: invite.id, channel: 'whatsapp', status: 'failed',
                error_message: (await waRes.text()).slice(0, 200),
              });
            }
            break;
          }

          case 'telegram': {
            const botUsername = Deno.env.get('TELEGRAM_BOT_USERNAME');
            telegramDeepLink = botUsername
              ? `https://t.me/${botUsername}?start=beta_${invite.token}`
              : null;

            // If we have a chat_id, send directly
            const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
            if (botToken && invite.telegram_chat_id) {
              const tgBody = `Hi ${name}! Invited to test **Independent Minds EDU**.\n${notes ? notes + '\n' : ''}[Accept invitation](${inviteUrl})\nExpires 14 days`;
              const tgRes = await fetch(
                `https://api.telegram.org/bot${botToken}/sendMessage`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chat_id: invite.telegram_chat_id,
                    text: tgBody,
                    parse_mode: 'Markdown',
                  }),
                },
              );
              if (tgRes.ok) {
                channelsSent.push('telegram');
                await db.from('beta_invite_logs').insert({
                  invite_id: invite.id, channel: 'telegram', status: 'sent',
                });
              } else {
                channelsFailed.push('telegram');
                await db.from('beta_invite_logs').insert({
                  invite_id: invite.id, channel: 'telegram', status: 'failed',
                  error_message: (await tgRes.text()).slice(0, 200),
                });
              }
            } else {
              // No direct chat — deep link generated, log as 'copied'
              channelsSent.push('telegram');
              await db.from('beta_invite_logs').insert({
                invite_id: invite.id, channel: 'telegram', status: 'copied',
              });
            }
            break;
          }
        }
      } catch (chErr: any) {
        channelsFailed.push(channel);
        await db.from('beta_invite_logs').insert({
          invite_id: invite.id, channel, status: 'failed',
          error_message: chErr.message?.slice(0, 200),
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      invite_url: inviteUrl,
      telegram_deep_link: telegramDeepLink,
      channels_sent: channelsSent,
      channels_failed: channelsFailed,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
