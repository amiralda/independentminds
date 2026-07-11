/**
 * Boundary tests for webhook HMAC timestamp tolerance.
 *
 * We can't produce a valid signature without the shared secret, so we probe
 * the *timestamp* branch specifically: `handle-email-suppression` returns a
 * distinct body ("Stale timestamp") when the timestamp is outside the
 * allowed clock-skew window, and "Invalid signature" when the timestamp is
 * accepted but the signature fails. That lets us pin down the exact
 * boundary of the tolerance window.
 *
 * Tolerance defaults to 300s in the edge webhook verifier. Override
 * with WEBHOOK_HMAC_TOLERANCE_SECONDS if the library/config changes.
 *
 * `auth-email-hook` collapses both errors to "Invalid signature", so we
 * only assert status codes there — boundary semantics are validated by the
 * suppression endpoint tests below.
 *
 * Env required: SUPABASE_URL, SUPABASE_ANON_KEY
 */
import { test, expect, request as pwRequest, APIResponse } from '@playwright/test';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const ANON = process.env.SUPABASE_ANON_KEY!;
const FN_BASE = `${SUPABASE_URL}/functions/v1`;

const TOLERANCE_SECONDS = Number(
  process.env.WEBHOOK_HMAC_TOLERANCE_SECONDS ?? 300,
);
const EDGE_MARGIN_SECONDS = 30; // buffer for network + clock jitter

test.describe.configure({ mode: 'parallel' });

const FAKE_SIG = 'sha256=' + 'a'.repeat(64);
const now = () => Math.floor(Date.now() / 1000);

const headers = (tsOffsetSeconds: number) => ({
  apikey: ANON,
  'content-type': 'application/json',
  'x-webhook-signature': FAKE_SIG,
  'x-webhook-timestamp': String(now() + tsOffsetSeconds),
});

async function bodyText(res: APIResponse): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}

const SUPPRESSION_URL = `${FN_BASE}/handle-email-suppression`;
const AUTH_HOOK_URL = `${FN_BASE}/auth-email-hook`;
const suppressionPayload = { type: 'email.bounced', data: { email: 'x@example.com' } };
const authHookPayload = { user: { email: 'x@example.com' }, email_data: {} };

// ---- handle-email-suppression: exact-boundary discrimination -------------

test.describe('handle-email-suppression — HMAC timestamp tolerance boundary', () => {
  test(`accepts timestamps just INSIDE the ±${TOLERANCE_SECONDS}s window (not stale)`, async () => {
    const r = await pwRequest.newContext();
    // Just inside the past edge.
    const pastInside = await r.post(SUPPRESSION_URL, {
      headers: headers(-(TOLERANCE_SECONDS - EDGE_MARGIN_SECONDS)),
      data: suppressionPayload,
    });
    // Just inside the future edge.
    const futureInside = await r.post(SUPPRESSION_URL, {
      headers: headers(TOLERANCE_SECONDS - EDGE_MARGIN_SECONDS),
      data: suppressionPayload,
    });

    for (const res of [pastInside, futureInside]) {
      expect(res.status()).toBe(401); // still rejected — bad signature
      const body = await bodyText(res);
      // Must NOT be classified as stale — the timestamp was accepted.
      expect(body.toLowerCase()).not.toContain('stale');
      expect(body.toLowerCase()).toContain('invalid signature');
    }
  });

  test(`rejects timestamps just OUTSIDE the past edge as stale`, async () => {
    const r = await pwRequest.newContext();
    const res = await r.post(SUPPRESSION_URL, {
      headers: headers(-(TOLERANCE_SECONDS + EDGE_MARGIN_SECONDS)),
      data: suppressionPayload,
    });
    expect(res.status()).toBe(401);
    const body = await bodyText(res);
    expect(body.toLowerCase()).toContain('stale');
  });

  test(`rejects timestamps just OUTSIDE the future edge`, async () => {
    const r = await pwRequest.newContext();
    const res = await r.post(SUPPRESSION_URL, {
      headers: headers(TOLERANCE_SECONDS + EDGE_MARGIN_SECONDS),
      data: suppressionPayload,
    });
    expect(res.status()).toBe(401);
    const body = await bodyText(res);
    // Library may classify future skew as stale or invalid_timestamp; both
    // are acceptable rejections.
    expect(
      body.toLowerCase().includes('stale') ||
        body.toLowerCase().includes('invalid'),
    ).toBe(true);
  });

  test('rejects far-past timestamps (24h stale)', async () => {
    const r = await pwRequest.newContext();
    const res = await r.post(SUPPRESSION_URL, {
      headers: headers(-60 * 60 * 24),
      data: suppressionPayload,
    });
    expect(res.status()).toBe(401);
    const body = await bodyText(res);
    expect(body.toLowerCase()).toContain('stale');
  });
});

// ---- auth-email-hook: status-only boundary (body is generic) -------------

test.describe('auth-email-hook — HMAC timestamp tolerance boundary', () => {
  test(`returns 401 for timestamps just INSIDE the window (bad sig path)`, async () => {
    const r = await pwRequest.newContext();
    const res = await r.post(AUTH_HOOK_URL, {
      headers: headers(-(TOLERANCE_SECONDS - EDGE_MARGIN_SECONDS)),
      data: authHookPayload,
    });
    expect(res.status()).toBe(401);
  });

  test(`returns 401 for timestamps just OUTSIDE the past edge (stale)`, async () => {
    const r = await pwRequest.newContext();
    const res = await r.post(AUTH_HOOK_URL, {
      headers: headers(-(TOLERANCE_SECONDS + EDGE_MARGIN_SECONDS)),
      data: authHookPayload,
    });
    expect(res.status()).toBe(401);
  });

  test(`returns 401 for timestamps just OUTSIDE the future edge`, async () => {
    const r = await pwRequest.newContext();
    const res = await r.post(AUTH_HOOK_URL, {
      headers: headers(TOLERANCE_SECONDS + EDGE_MARGIN_SECONDS),
      data: authHookPayload,
    });
    expect(res.status()).toBe(401);
  });
});
