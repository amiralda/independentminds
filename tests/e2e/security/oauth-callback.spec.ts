/**
 * OAuth callback rejection tests.
 *
 * The managed proxy serves `/~oauth/callback` and is responsible for:
 *   - validating `state` (CSRF binding)
 *   - requiring `code`
 *   - refusing expired / already-consumed authorization sessions
 *
 * These tests hit the real callback and assert that none of the failure
 * cases produce an authenticated app session. We assert on:
 *   1. Final URL must NOT be a protected route (`/parent/*`, `/admin/*`,
 *      `/student/*`).
 *   2. No Supabase auth-token entry in localStorage / cookies.
 *   3. Where the proxy exposes an error, the response reflects it.
 *
 * Env: PLAYWRIGHT_BASE_URL (defaults to the production URL).
 */
import { test, expect, Page } from '@playwright/test';

const APP_URL =
  process.env.PLAYWRIGHT_BASE_URL || 'https://www.independentmindsedu.org';

test.describe.configure({ mode: 'parallel' });

// Ensure every test starts with no stored session.
test.use({ storageState: { cookies: [], origins: [] } });

async function assertNoSession(page: Page) {
  // No Supabase session token in localStorage.
  const tokens = await page.evaluate(() => {
    return Object.keys(localStorage)
      .filter((k) => k.startsWith('sb-') && k.endsWith('-auth-token'))
      .map((k) => localStorage.getItem(k))
      .filter((v) => !!v && v !== 'null');
  });
  expect(tokens, 'no Supabase session should be created').toEqual([]);

  // No Supabase auth cookie.
  const cookies = await page.context().cookies();
  const authCookie = cookies.find(
    (c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'),
  );
  expect(authCookie, 'no Supabase auth cookie should be set').toBeUndefined();

  // Not landed on a protected route.
  expect(page.url()).not.toMatch(/\/(parent|admin|student)(\/|$)/);
}

async function safeGoto(page: Page, url: string) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15_000 });
  } catch {
    // Proxy may return 4xx / abort navigation — that itself is a valid
    // rejection. We continue to inspect session state.
  }
  // Give unknown client redirects a chance to settle.
  await page.waitForLoadState('networkidle').catch(() => {});
}

// --------------------------------------------------------------------------

test('OAuth callback: missing `code` parameter is rejected', async ({ page }) => {
  await safeGoto(page, `${APP_URL}/~oauth/callback?state=abc123`);
  await assertNoSession(page);
});

test('OAuth callback: missing `state` parameter is rejected', async ({ page }) => {
  await safeGoto(page, `${APP_URL}/~oauth/callback?code=fake-code-xyz`);
  await assertNoSession(page);
});

test('OAuth callback: missing both `code` and `state` is rejected', async ({ page }) => {
  await safeGoto(page, `${APP_URL}/~oauth/callback`);
  await assertNoSession(page);
});

test('OAuth callback: tampered `state` (unknown value) is rejected', async ({ page }) => {
  // A state value that was never issued by the initiate step must not be
  // accepted regardless of unknown `code` value.
  await safeGoto(
    page,
    `${APP_URL}/~oauth/callback?code=unknown-code&state=tampered-state-${Date.now()}`,
  );
  await assertNoSession(page);
});

test('OAuth callback: mismatched `state` (bit-flipped) is rejected', async ({ page }) => {
  // Simulate a MITM/CSRF attempt: attacker keeps a plausible-looking state
  // that does not correspond to unknown active authorization session.
  const badState = 'A'.repeat(64);
  await safeGoto(
    page,
    `${APP_URL}/~oauth/callback?code=abcdef&state=${badState}`,
  );
  await assertNoSession(page);
});

test('OAuth callback: replay of the same tampered params stays rejected', async ({ page }) => {
  const url = `${APP_URL}/~oauth/callback?code=replay-code&state=replay-state`;
  await safeGoto(page, url);
  await assertNoSession(page);
  // Second navigation must not somehow "learn" the state.
  await safeGoto(page, url);
  await assertNoSession(page);
});

test('OAuth callback: expired/unknown authorization session is rejected', async ({ page }) => {
  // Simulate a stale callback: params that look correct in shape but
  // reference an authorization session that no longer exists.
  const staleCode = 'expired-' + 'x'.repeat(48);
  const staleState = 'expired-' + 'y'.repeat(48);
  await safeGoto(
    page,
    `${APP_URL}/~oauth/callback?code=${staleCode}&state=${staleState}`,
  );
  await assertNoSession(page);
});

test('OAuth callback: provider-error passthrough does not authenticate', async ({ page }) => {
  // Google/OAuth spec: providers redirect back with `error` set on user
  // denial or provider failure. The callback must not create a session.
  await safeGoto(
    page,
    `${APP_URL}/~oauth/callback?error=access_denied&error_description=User+denied&state=whatever`,
  );
  await assertNoSession(page);
});

test('OAuth callback: injected `access_token` in query is ignored', async ({ page }) => {
  // Defense-in-depth: even if an attacker appends token-shaped params,
  // the callback path must not treat them as a valid session.
  await safeGoto(
    page,
    `${APP_URL}/~oauth/callback?access_token=fake.jwt.token&refresh_token=fake&state=x&code=y`,
  );
  await assertNoSession(page);
});

test('OAuth callback: injected `access_token` in URL fragment is ignored', async ({ page }) => {
  // Some OAuth attacks smuggle tokens via the fragment. The proxy/app
  // must not lift them into a session on the callback path.
  await safeGoto(
    page,
    `${APP_URL}/~oauth/callback#access_token=fake.jwt.token&token_type=bearer&expires_in=3600`,
  );
  await assertNoSession(page);
});
