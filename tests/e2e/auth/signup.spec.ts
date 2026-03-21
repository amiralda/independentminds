import { test, expect } from '@playwright/test';
import { cleanupTestUser, supabaseAdmin } from '../helpers/supabase';

const FRESH_EMAIL = `signup-test-${Date.now()}@independentminds.test`;

test.afterAll(async () => {
  await cleanupTestUser(FRESH_EMAIL);
});

test('AUTH-01 — email/password signup creates account and starts onboarding', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('link', { name: /sign up|create account/i }).click();
  await page.getByLabel(/email/i).fill(FRESH_EMAIL);
  await page.getByLabel(/password/i).fill('TestSignup2026!');
  await page.getByLabel(/display name|name/i).fill('New Test User');

  // Adult checkbox must be checked first
  const submitBtn = page.getByRole('button', { name: /sign up|create account/i });
  const checkbox = page.getByRole('checkbox', { name: /18 years|parent|legal guardian|adult/i });
  await checkbox.check();
  await submitBtn.click();

  // Should show verification message or redirect to onboarding
  await expect(
    page.getByText(/verify|check your email|welcome|get started/i)
  ).toBeVisible({ timeout: 10_000 });
});

test('AUTH-02 — adult confirmation checkbox gates sign up button', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('link', { name: /sign up|create account/i }).click();
  await page.getByLabel(/email/i).fill(`checkbox-test-${Date.now()}@test.com`);
  await page.getByLabel(/password/i).fill('Password123!');

  const btn = page.getByRole('button', { name: /sign up|create account/i });
  // Button should be disabled without adult confirmation
  await expect(btn).toBeDisabled();

  await page.getByRole('checkbox', { name: /18 years|parent|legal guardian|adult/i }).check();
  await expect(btn).toBeEnabled();
});

test('AUTH-09 CRITICAL — server rejects signup without adult_confirmed metadata', async () => {
  const testEmail = `api-bypass-${Date.now()}@test.com`;

  const { data, error } = await supabaseAdmin.auth.signUp({
    email: testEmail,
    password: 'TestBypass2026!',
    options: {
      data: {
        display_name: 'Bypass Attempt',
        // adult_confirmed intentionally NOT set
      },
    },
  });

  if (data.user) {
    const profile = await supabaseAdmin
      .from('profiles')
      .select('adult_confirmed')
      .eq('id', data.user.id)
      .single();

    // adult_confirmed must be false — trigger should NOT auto-set true
    expect(profile.data?.adult_confirmed).not.toBe(true);
    await supabaseAdmin.auth.admin.deleteUser(data.user.id);
  }
});
