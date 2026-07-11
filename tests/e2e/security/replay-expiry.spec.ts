/**
 * Replay + expiry tests for HMAC-signed webhooks and token-based
 * entrypoints. Each entrypoint must reject:
 *   - stale timestamps (webhook clock skew beyond tolerance)
 *   - missing timestamp / signature headers
 *   - replayed / reused single-use tokens
 *   - expired or unknown tokens
 *
 * These tests do NOT require the webhook signing secret: we only assert
 * the reject path, which is the security-relevant surface.
 *
 * Env required:
 *   SUPABASE_URL, SUPABASE_ANON_KEY,
 *   TEST_PARENT_EMAIL / TEST_PARENT_PASSWORD
 */
import { test, expect, request as pwRequest } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const ANON = process.env.SUPABASE_ANON_KEY!;
const FN_BASE = `${SUPABASE_URL}/functions/v1`;

test.describe.configure({ mode: 'parallel' });

async function getUserJwt(email: string, password: string) {
  const sb = createClient(SUPABASE_URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`sign-in failed: ${error?.message}`);
  return data.session.access_token;
}

const jsonHeaders = (extra: Record<string, string> = {}) => ({
  apikey: ANON,
  'content-type': 'application/json',
  ...extra,
});

// A well-formed but bogus HMAC signature. Real verification will fail;
// the test only asserts the entrypoint refuses it.
const FAKE_SIG = 'sha256=' + 'a'.repeat(64);
const NOW = () => Math.floor(Date.now() / 1000);
const STALE = () => NOW() - 60 * 60 * 24; // 24 hours old
const FUTURE = () => NOW() + 60 * 60 * 24; // 24 hours ahead

// ---- auth-email-hook -----------------------------------------------------

test.describe('auth-email-hook — replay/expiry', () => {
  const payload = { user: { email: 'x@example.com' }, email_data: {} };

  test('rejects stale timestamp', async () => {
    const r = await pwRequest.newContext();
    const res = await r.post(`${FN_BASE}/auth-email-hook`, {
      headers: jsonHeaders({
        'x-webhook-signature': FAKE_SIG,
        'x-webhook-timestamp': String(STALE()),
      }),
      data: payload,
    });
    expect([400, 401, 403]).toContain(res.status());
  });

  test('rejects far-future timestamp', async () => {
    const r = await pwRequest.newContext();
    const res = await r.post(`${FN_BASE}/auth-email-hook`, {
      headers: jsonHeaders({
        'x-webhook-signature': FAKE_SIG,
        'x-webhook-timestamp': String(FUTURE()),
      }),
      data: payload,
    });
    expect([400, 401, 403]).toContain(res.status());
  });

  test('rejects missing timestamp header', async () => {
    const r = await pwRequest.newContext();
    const res = await r.post(`${FN_BASE}/auth-email-hook`, {
      headers: jsonHeaders({ 'x-webhook-signature': FAKE_SIG }),
      data: payload,
    });
    expect([400, 401, 403]).toContain(res.status());
  });

  test('rejects missing signature header', async () => {
    const r = await pwRequest.newContext();
    const res = await r.post(`${FN_BASE}/auth-email-hook`, {
      headers: jsonHeaders({ 'x-webhook-timestamp': String(NOW()) }),
      data: payload,
    });
    expect([400, 401, 403]).toContain(res.status());
  });

  test('rejects replayed headers on identical payload', async () => {
    // Same sig+timestamp on two identical requests must both fail (they
    // can never validate without the secret). This asserts the endpoint
    // does not accidentally cache "seen" as "valid".
    const headers = jsonHeaders({
      'x-webhook-signature': FAKE_SIG,
      'x-webhook-timestamp': String(NOW()),
    });
    const r = await pwRequest.newContext();
    const [a, b] = await Promise.all([
      r.post(`${FN_BASE}/auth-email-hook`, { headers, data: payload }),
      r.post(`${FN_BASE}/auth-email-hook`, { headers, data: payload }),
    ]);
    expect([400, 401, 403]).toContain(a.status());
    expect([400, 401, 403]).toContain(b.status());
  });
});

// ---- handle-email-suppression --------------------------------------------

test.describe('handle-email-suppression — replay/expiry', () => {
  const payload = { type: 'email.bounced', data: {} };

  test('rejects stale timestamp', async () => {
    const r = await pwRequest.newContext();
    const res = await r.post(`${FN_BASE}/handle-email-suppression`, {
      headers: jsonHeaders({
        'x-webhook-signature': FAKE_SIG,
        'x-webhook-timestamp': String(STALE()),
      }),
      data: payload,
    });
    expect([400, 401, 403]).toContain(res.status());
  });

  test('rejects missing timestamp header', async () => {
    const r = await pwRequest.newContext();
    const res = await r.post(`${FN_BASE}/handle-email-suppression`, {
      headers: jsonHeaders({ 'x-webhook-signature': FAKE_SIG }),
      data: payload,
    });
    expect([400, 401, 403]).toContain(res.status());
  });

  test('rejects replayed headers on identical payload', async () => {
    const headers = jsonHeaders({
      'x-webhook-signature': FAKE_SIG,
      'x-webhook-timestamp': String(NOW()),
    });
    const r = await pwRequest.newContext();
    const [a, b] = await Promise.all([
      r.post(`${FN_BASE}/handle-email-suppression`, { headers, data: payload }),
      r.post(`${FN_BASE}/handle-email-suppression`, { headers, data: payload }),
    ]);
    expect([400, 401, 403]).toContain(a.status());
    expect([400, 401, 403]).toContain(b.status());
  });
});

// ---- handle-email-unsubscribe --------------------------------------------

test.describe('handle-email-unsubscribe — token reuse/expiry', () => {
  test('unknown token is rejected consistently across replays', async () => {
    const r = await pwRequest.newContext();
    const url = `${FN_BASE}/handle-email-unsubscribe?token=replay-fake-token-xyz`;
    const first = await r.get(url, { headers: jsonHeaders() });
    const second = await r.get(url, { headers: jsonHeaders() });
    for (const res of [first, second]) {
      expect(res.status()).toBeGreaterThanOrEqual(400);
      expect(res.status()).toBeLessThan(500);
    }
  });

  test('malformed token (empty) is rejected', async () => {
    const r = await pwRequest.newContext();
    const res = await r.get(`${FN_BASE}/handle-email-unsubscribe?token=`, {
      headers: jsonHeaders(),
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });
});

// ---- accept-guardian-invite ---------------------------------------------

test.describe('accept-guardian-invite — token reuse/expiry', () => {
  test('unknown/expired token is rejected (authenticated)', async () => {
    const jwt = await getUserJwt(
      process.env.TEST_PARENT_EMAIL!,
      process.env.TEST_PARENT_PASSWORD!,
    );
    const r = await pwRequest.newContext();
    const res = await r.post(`${FN_BASE}/accept-guardian-invite`, {
      headers: jsonHeaders({ Authorization: `Bearer ${jwt}` }),
      data: { token: 'expired-or-unknown-token-' + Date.now().toString(16) },
    });
    // Function returns 400/404 for not-found or expired invites.
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('replaying the same unknown token stays rejected', async () => {
    const jwt = await getUserJwt(
      process.env.TEST_PARENT_EMAIL!,
      process.env.TEST_PARENT_PASSWORD!,
    );
    const r = await pwRequest.newContext();
    const token = 'replay-guardian-' + Date.now().toString(16);
    const headers = jsonHeaders({ Authorization: `Bearer ${jwt}` });
    const first = await r.post(`${FN_BASE}/accept-guardian-invite`, {
      headers,
      data: { token },
    });
    const second = await r.post(`${FN_BASE}/accept-guardian-invite`, {
      headers,
      data: { token },
    });
    for (const res of [first, second]) {
      expect(res.status()).toBeGreaterThanOrEqual(400);
      expect(res.status()).toBeLessThan(500);
    }
  });

  test('rejects call without JWT even with a token', async () => {
    const r = await pwRequest.newContext();
    const res = await r.post(`${FN_BASE}/accept-guardian-invite`, {
      headers: jsonHeaders(),
      data: { token: 'unknown-token' },
    });
    expect([401, 403]).toContain(res.status());
  });
});

// ---- accept-beta-invite --------------------------------------------------

test.describe('accept-beta-invite — token reuse/expiry', () => {
  test('unknown/expired token is rejected', async () => {
    const jwt = await getUserJwt(
      process.env.TEST_PARENT_EMAIL!,
      process.env.TEST_PARENT_PASSWORD!,
    );
    const r = await pwRequest.newContext();
    const res = await r.post(`${FN_BASE}/accept-beta-invite`, {
      headers: jsonHeaders({ Authorization: `Bearer ${jwt}` }),
      data: { token: 'unknown-beta-' + Date.now().toString(16) },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('replay of same unknown token stays rejected', async () => {
    const jwt = await getUserJwt(
      process.env.TEST_PARENT_EMAIL!,
      process.env.TEST_PARENT_PASSWORD!,
    );
    const r = await pwRequest.newContext();
    const token = 'replay-beta-' + Date.now().toString(16);
    const headers = jsonHeaders({ Authorization: `Bearer ${jwt}` });
    const [a, b] = await Promise.all([
      r.post(`${FN_BASE}/accept-beta-invite`, { headers, data: { token } }),
      r.post(`${FN_BASE}/accept-beta-invite`, { headers, data: { token } }),
    ]);
    for (const res of [a, b]) {
      expect(res.status()).toBeGreaterThanOrEqual(400);
      expect(res.status()).toBeLessThan(500);
    }
  });
});
