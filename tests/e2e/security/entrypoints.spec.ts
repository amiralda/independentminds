/**
 * Integration tests for OAuth callback + email/webhook edge function
 * entrypoints. Each endpoint must reject unauthenticated or tampered
 * requests, and (where feasible) accept valid ones.
 *
 * Env required:
 *   SUPABASE_URL                   - project URL (https://<ref>.supabase.co)
 *   SUPABASE_ANON_KEY              - anon/publishable key (gateway apikey)
 *   TEST_PARENT_EMAIL / _PASSWORD  - parent test account
 *   TEST_ADMIN_EMAIL  / _PASSWORD  - admin test account
 *
 * Optional (skipped when absent):
 *   TEST_CRON_SECRET               - to assert cron functions accept it
 *   TEST_TELEGRAM_WEBHOOK_SECRET   - to assert telegram webhook accepts it
 */
import { test, expect, request as pwRequest, APIRequestContext } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const ANON = process.env.SUPABASE_ANON_KEY!;
const FN_BASE = `${SUPABASE_URL}/functions/v1`;
const APP_URL =
  process.env.PLAYWRIGHT_BASE_URL || 'https://independentmindsedu.com';

test.describe.configure({ mode: 'parallel' });

// ---- helpers -------------------------------------------------------------

async function getUserJwt(email: string, password: string): Promise<string> {
  const sb = createClient(SUPABASE_URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`sign-in failed: ${error?.message}`);
  return data.session.access_token;
}

function fnHeaders(extra: Record<string, string> = {}) {
  // apikey is required by the Supabase gateway; presence alone does not
  // authenticate a user against functions that inspect Authorization.
  return { apikey: ANON, 'content-type': 'application/json', ...extra };
}

async function req(): Promise<APIRequestContext> {
  return pwRequest.newContext({ ignoreHTTPSErrors: true });
}

// ---- ai-tutor ------------------------------------------------------------

test.describe('ai-tutor', () => {
  test('rejects unauthenticated requests', async () => {
    const r = await req();
    const res = await r.post(`${FN_BASE}/ai-tutor`, {
      headers: fnHeaders(),
      data: { studentId: 'IME-000001', subject: 'math', message: 'hi' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('rejects parent asking about a student they do not own', async () => {
    const jwt = await getUserJwt(
      process.env.TEST_PARENT_EMAIL!,
      process.env.TEST_PARENT_PASSWORD!,
    );
    const r = await req();
    const res = await r.post(`${FN_BASE}/ai-tutor`, {
      headers: fnHeaders({ Authorization: `Bearer ${jwt}` }),
      data: {
        studentId: 'IME-NOTMINE-999',
        subject: 'math',
        message: 'hi',
      },
    });
    expect([401, 403]).toContain(res.status());
  });
});

// ---- track-error ---------------------------------------------------------

test.describe('track-error', () => {
  test('rejects requests without a Bearer token', async () => {
    const r = await req();
    const res = await r.post(`${FN_BASE}/track-error`, {
      headers: fnHeaders(),
      data: { message: 'x' },
    });
    expect(res.status()).toBe(401);
  });

  test('rejects tampered / non-JWT Bearer tokens', async () => {
    const r = await req();
    const res = await r.post(`${FN_BASE}/track-error`, {
      headers: fnHeaders({ Authorization: 'Bearer not-a-real-jwt' }),
      data: { message: 'x' },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('accepts a valid parent JWT', async () => {
    const jwt = await getUserJwt(
      process.env.TEST_PARENT_EMAIL!,
      process.env.TEST_PARENT_PASSWORD!,
    );
    const r = await req();
    const res = await r.post(`${FN_BASE}/track-error`, {
      headers: fnHeaders({ Authorization: `Bearer ${jwt}` }),
      data: {
        message: 'integration-test error',
        source: 'entrypoints.spec.ts',
      },
    });
    expect(res.status()).toBeLessThan(500);
    expect(res.status()).not.toBe(401);
  });
});

// ---- telegram-link -------------------------------------------------------

test.describe('telegram-link', () => {
  test('rejects unauthenticated requests', async () => {
    const r = await req();
    const res = await r.post(`${FN_BASE}/telegram-link`, {
      headers: fnHeaders(),
      data: {},
    });
    expect([401, 403]).toContain(res.status());
  });
});

// ---- beta-telegram-webhook -----------------------------------------------

test.describe('beta-telegram-webhook', () => {
  test('rejects requests missing the Telegram secret header', async () => {
    const r = await req();
    const res = await r.post(`${FN_BASE}/beta-telegram-webhook`, {
      headers: fnHeaders(),
      data: { update_id: 1 },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('rejects requests with a wrong Telegram secret header', async () => {
    const r = await req();
    const res = await r.post(`${FN_BASE}/beta-telegram-webhook`, {
      headers: fnHeaders({
        'X-Telegram-Bot-Api-Secret-Token': 'definitely-wrong',
      }),
      data: { update_id: 1 },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('accepts requests with the correct secret header', async () => {
    test.skip(
      !process.env.TEST_TELEGRAM_WEBHOOK_SECRET,
      'TEST_TELEGRAM_WEBHOOK_SECRET not set',
    );
    const r = await req();
    const res = await r.post(`${FN_BASE}/beta-telegram-webhook`, {
      headers: fnHeaders({
        'X-Telegram-Bot-Api-Secret-Token':
          process.env.TEST_TELEGRAM_WEBHOOK_SECRET!,
      }),
      data: { update_id: 1 }, // no message payload => no-op
    });
    expect(res.status()).toBeLessThan(500);
    expect([401, 403]).not.toContain(res.status());
  });
});

// ---- auth-email-hook (HMAC) ----------------------------------------------

test.describe('auth-email-hook', () => {
  test('rejects requests without a Lovable webhook signature', async () => {
    const r = await req();
    const res = await r.post(`${FN_BASE}/auth-email-hook`, {
      headers: fnHeaders(),
      data: { user: { email: 'x@example.com' }, email_data: {} },
    });
    expect([400, 401, 403]).toContain(res.status());
  });

  test('rejects a tampered signature', async () => {
    const r = await req();
    const res = await r.post(`${FN_BASE}/auth-email-hook`, {
      headers: fnHeaders({
        'x-lovable-signature': 'sha256=deadbeef',
        'x-lovable-timestamp': String(Math.floor(Date.now() / 1000)),
      }),
      data: { user: { email: 'x@example.com' }, email_data: {} },
    });
    expect([400, 401, 403]).toContain(res.status());
  });
});

// ---- handle-email-suppression (HMAC) -------------------------------------

test.describe('handle-email-suppression', () => {
  test('rejects requests without a valid webhook signature', async () => {
    const r = await req();
    const res = await r.post(`${FN_BASE}/handle-email-suppression`, {
      headers: fnHeaders(),
      data: { type: 'email.bounced', data: {} },
    });
    expect([400, 401, 403]).toContain(res.status());
  });
});

// ---- handle-email-unsubscribe --------------------------------------------

test.describe('handle-email-unsubscribe', () => {
  test('rejects GET without a token', async () => {
    const r = await req();
    const res = await r.get(`${FN_BASE}/handle-email-unsubscribe`, {
      headers: fnHeaders(),
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('rejects an unknown/tampered token', async () => {
    const r = await req();
    const res = await r.get(
      `${FN_BASE}/handle-email-unsubscribe?token=not-a-real-token`,
      { headers: fnHeaders() },
    );
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });
});

// ---- approve-beta-request ------------------------------------------------

test.describe('approve-beta-request', () => {
  test('rejects unauthenticated callers', async () => {
    const r = await req();
    const res = await r.post(`${FN_BASE}/approve-beta-request`, {
      headers: fnHeaders(),
      data: { requestId: '00000000-0000-0000-0000-000000000000' },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('rejects non-admin (parent) callers with 403', async () => {
    const jwt = await getUserJwt(
      process.env.TEST_PARENT_EMAIL!,
      process.env.TEST_PARENT_PASSWORD!,
    );
    const r = await req();
    const res = await r.post(`${FN_BASE}/approve-beta-request`, {
      headers: fnHeaders({ Authorization: `Bearer ${jwt}` }),
      data: { requestId: '00000000-0000-0000-0000-000000000000' },
    });
    expect(res.status()).toBe(403);
  });
});

// ---- cron endpoints (x-cron-secret) --------------------------------------

const CRON_FUNCTIONS = [
  'hourly-monitor',
  'morning-reminder',
  'checkin-reminder',
  'daily-report',
  'weekly-report',
  'weekly-badge',
  'weekly-backup',
  'beta-daily-digest',
];

for (const fn of CRON_FUNCTIONS) {
  test.describe(`cron: ${fn}`, () => {
    test('rejects requests without x-cron-secret', async () => {
      const r = await req();
      const res = await r.post(`${FN_BASE}/${fn}`, {
        headers: fnHeaders(),
        data: {},
      });
      expect(res.status()).toBe(401);
    });

    test('rejects requests with wrong x-cron-secret', async () => {
      const r = await req();
      const res = await r.post(`${FN_BASE}/${fn}`, {
        headers: fnHeaders({ 'x-cron-secret': 'wrong-secret' }),
        data: {},
      });
      expect(res.status()).toBe(401);
    });

    test('accepts the correct x-cron-secret', async () => {
      test.skip(!process.env.TEST_CRON_SECRET, 'TEST_CRON_SECRET not set');
      const r = await req();
      const res = await r.post(`${FN_BASE}/${fn}`, {
        headers: fnHeaders({
          'x-cron-secret': process.env.TEST_CRON_SECRET!,
        }),
        data: {},
      });
      expect(res.status()).not.toBe(401);
      expect(res.status()).toBeLessThan(500);
    });
  });
}

// ---- OAuth callback ------------------------------------------------------

test.describe('OAuth callback (/~oauth/callback)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('unauthenticated visit does not create a session', async ({ page }) => {
    // Hit the callback with no OAuth params. Managed proxy must not
    // hand out an authenticated session.
    await page.goto(`${APP_URL}/~oauth/callback`, {
      waitUntil: 'domcontentloaded',
    }).catch(() => { /* proxy may 4xx, that's fine */ });

    // Any Supabase session cookie/localStorage must be empty.
    const session = await page.evaluate(() => {
      const keys = Object.keys(localStorage).filter((k) =>
        k.startsWith('sb-') && k.endsWith('-auth-token'),
      );
      return keys.map((k) => localStorage.getItem(k));
    });
    for (const v of session) {
      expect(v).toBeFalsy();
    }
  });

  test('tampered code parameter does not authenticate', async ({ page }) => {
    await page.goto(
      `${APP_URL}/~oauth/callback?code=tampered&state=tampered`,
      { waitUntil: 'domcontentloaded' },
    ).catch(() => { /* proxy 4xx acceptable */ });

    // Must not land on an authenticated route.
    expect(page.url()).not.toMatch(/\/(parent|admin|student)\//);
  });
});
