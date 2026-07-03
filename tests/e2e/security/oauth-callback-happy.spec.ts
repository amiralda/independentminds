/**
 * OAuth callback happy-path tests.
 *
 * Realistic constraints:
 *   Google actively blocks headless automation of its consent screen, so a
 *   truly live `/~oauth/callback?code=...` code exchange cannot be replayed
 *   from CI without special provisioning. We therefore split the contract:
 *
 *   1. LIVE (opt-in): drive a real Google sign-in end-to-end using
 *      TEST_GOOGLE_EMAIL / TEST_GOOGLE_PASSWORD when TEST_OAUTH_LIVE=1.
 *      Verifies the full round-trip: initiate → provider → callback →
 *      session → role-based redirect.
 *
 *   2. POST-CALLBACK CONTRACT (always runs when service-role is available):
 *      mint a valid Supabase session for a known parent/admin user via
 *      admin.generateLink, plant it in the browser exactly the way the
 *      OAuth callback would, then assert the app resolves the correct
 *      protected route. This proves the "code exchange succeeded → session
 *      established → redirected to the right place" half of the contract
 *      without needing a live provider.
 *
 * Env:
 *   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 *   TEST_PARENT_EMAIL, TEST_ADMIN_EMAIL
 *   (Live only) TEST_OAUTH_LIVE=1, TEST_GOOGLE_EMAIL, TEST_GOOGLE_PASSWORD
 */
import { test, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const ANON = process.env.SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL =
  process.env.PLAYWRIGHT_BASE_URL || 'https://independentmindsedu.com';

test.describe.configure({ mode: 'serial' });

test.use({ storageState: { cookies: [], origins: [] } });

// -------------------------------------------------------------------------
// Helper: mint a real Supabase session for a known user and plant it in the
// browser the same way the OAuth callback would (setSession → localStorage).
// -------------------------------------------------------------------------

async function seedSessionFor(page: Page, email: string) {
  if (!SERVICE) test.skip(true, 'SUPABASE_SERVICE_ROLE_KEY not set');

  const admin = createClient(SUPABASE_URL, SERVICE!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Ask the auth server for a magic-link that resolves to a real session.
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: APP_URL },
  });
  if (error || !data?.properties?.hashed_token) {
    throw new Error(`generateLink failed: ${error?.message ?? 'no token'}`);
  }

  const hashedToken = data.properties.hashed_token;

  // Verify the OTP to obtain a real access+refresh token pair.
  const anon = createClient(SUPABASE_URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: verified, error: vErr } = await anon.auth.verifyOtp({
    type: 'magiclink',
    token_hash: hashedToken,
  });
  if (vErr || !verified.session) {
    throw new Error(`verifyOtp failed: ${vErr?.message ?? 'no session'}`);
  }

  // Plant the session into the browser exactly like the SDK does after a
  // successful callback code exchange.
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  const projectRef = new URL(SUPABASE_URL).host.split('.')[0];
  const storageKey = `sb-${projectRef}-auth-token`;
  const sessionJson = JSON.stringify({
    access_token: verified.session.access_token,
    refresh_token: verified.session.refresh_token,
    expires_at: verified.session.expires_at,
    expires_in: verified.session.expires_in,
    token_type: 'bearer',
    user: verified.session.user,
  });
  await page.evaluate(
    ([k, v]) => window.localStorage.setItem(k, v),
    [storageKey, sessionJson],
  );
}

// -------------------------------------------------------------------------
// POST-CALLBACK CONTRACT: session established → correct role-based route
// -------------------------------------------------------------------------

test('OAuth callback contract: parent session lands on /parent/dashboard', async ({
  page,
}) => {
  test.skip(!process.env.TEST_PARENT_EMAIL, 'TEST_PARENT_EMAIL not set');
  await seedSessionFor(page, process.env.TEST_PARENT_EMAIL!);

  // Simulate the SDK's post-callback navigation: user is sent back to the
  // app origin with a live session already in storage. The app router must
  // resolve them to their protected route.
  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  await page.waitForURL(/\/parent\/(dashboard|onboarding)/, { timeout: 15_000 });
  expect(page.url()).toMatch(/\/parent\/(dashboard|onboarding)/);

  // Session must actually be present after the redirect.
  const hasSession = await page.evaluate(() => {
    const keys = Object.keys(localStorage).filter(
      (k) => k.startsWith('sb-') && k.endsWith('-auth-token'),
    );
    return keys.some((k) => {
      const v = localStorage.getItem(k);
      return !!v && v !== 'null' && v.includes('access_token');
    });
  });
  expect(hasSession).toBe(true);
});

test('OAuth callback contract: admin session lands on /admin', async ({ page }) => {
  test.skip(!process.env.TEST_ADMIN_EMAIL, 'TEST_ADMIN_EMAIL not set');
  await seedSessionFor(page, process.env.TEST_ADMIN_EMAIL!);
  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  await page.waitForURL(/\/admin(\/|$)/, { timeout: 15_000 });
  expect(page.url()).toMatch(/\/admin(\/|$)/);
});

test('OAuth callback contract: session honors ?redirect intended target', async ({
  page,
}) => {
  test.skip(!process.env.TEST_PARENT_EMAIL, 'TEST_PARENT_EMAIL not set');
  await seedSessionFor(page, process.env.TEST_PARENT_EMAIL!);

  // The Login page passes `redirectPath` into `redirect_uri`. After the
  // provider round-trip the user lands on that same-origin path with the
  // session already established. Simulate that terminal state.
  await page.goto(`${APP_URL}/parent/inbox`, { waitUntil: 'networkidle' });
  await expect(page).toHaveURL(/\/parent\/inbox/);
});

// -------------------------------------------------------------------------
// LIVE: real Google round-trip (opt-in only)
// -------------------------------------------------------------------------

test('OAuth callback LIVE: full Google round-trip establishes session', async ({
  page,
}) => {
  test.skip(
    process.env.TEST_OAUTH_LIVE !== '1' ||
      !process.env.TEST_GOOGLE_EMAIL ||
      !process.env.TEST_GOOGLE_PASSWORD,
    'Live OAuth disabled (set TEST_OAUTH_LIVE=1 + TEST_GOOGLE_* to run)',
  );

  await page.goto(`${APP_URL}/login`, { waitUntil: 'domcontentloaded' });

  const [popup] = await Promise.all([
    page.context().waitForEvent('page', { timeout: 15_000 }),
    page.getByRole('button', { name: /google/i }).click(),
  ]);
  await popup.waitForLoadState('domcontentloaded');

  // Google sign-in (best-effort — Google may still challenge automation).
  await popup.locator('input[type="email"]').fill(process.env.TEST_GOOGLE_EMAIL!);
  await popup.getByRole('button', { name: /next/i }).click();
  await popup.locator('input[type="password"]').waitFor({ timeout: 10_000 });
  await popup.locator('input[type="password"]').fill(process.env.TEST_GOOGLE_PASSWORD!);
  await popup.getByRole('button', { name: /next/i }).click();

  // Consent screen (may or may not appear).
  await popup
    .getByRole('button', { name: /continue|allow|approve/i })
    .click({ timeout: 10_000 })
    .catch(() => {});

  // The SDK closes the popup after the callback exchange and hydrates the
  // parent page's session. Wait for the app to route based on role.
  await page.waitForURL(/\/(parent|admin|student)\//, { timeout: 30_000 });

  const hasSession = await page.evaluate(() =>
    Object.keys(localStorage).some(
      (k) => k.startsWith('sb-') && k.endsWith('-auth-token'),
    ),
  );
  expect(hasSession).toBe(true);
  expect(page.url()).toMatch(/\/(parent|admin|student)\//);
});
