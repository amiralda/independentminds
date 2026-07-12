import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function maskIpAddress(raw: string | null): string | null {
  if (!raw) return null;

  const first = raw.split(',')[0]?.trim();
  if (!first) return null;

  if (first.includes('.')) {
    const parts = first.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.x`;
    }
  }

  if (first.includes(':')) {
    const parts = first.split(':').filter(Boolean);
    return `${parts.slice(0, 3).join(':')}:*`;
  }

  return first.slice(0, 8);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const db = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const body = await req.json().catch(() => ({}));
    const emailAttempted =
      typeof body.emailAttempted === 'string' && body.emailAttempted.trim().length > 0
        ? body.emailAttempted.trim().toLowerCase().slice(0, 320)
        : null;
    const failureType =
      typeof body.failureType === 'string' && body.failureType.trim().length > 0
        ? body.failureType.trim().slice(0, 80)
        : 'unknown';

    const userAgent = (req.headers.get('user-agent') || '').slice(0, 300) || null;
    const ipHint = maskIpAddress(
      req.headers.get('x-forwarded-for') ||
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-real-ip')
    );

    await db.from('auth_failures').insert({
      email_attempted: emailAttempted,
      failure_type: failureType,
      ip_hint: ipHint,
      user_agent: userAgent,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 202,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('track-auth-failure:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});