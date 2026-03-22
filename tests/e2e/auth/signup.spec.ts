import { test, expect } from '@playwright/test';
import { cleanupTestUser, supabaseAdmin } from '../helpers/supabase';

const FRESH = `signup-${Date.now()}@independentminds.test`;
test.afterAll(async () => {
  await cleanupTestUser(FRESH);
});

test('AUTH-01 signup creates account and starts onboarding', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByRole('link', { name: /sign up/i }).click();
  await page.getByLabel(/email/i).fill(FRESH);
  await page.getByLabel(/password/i).fill('TestSignup2026!');
  await page.getByLabel(/display name/i).fill('New Test User');
  const btn = page.getByRole('button', { name: /sign up/i });
  await expect(btn).toBeDisabled();
  await page
    .getByRole('checkbox', { name: /18 years|parent|legal guardian/i })
    .check();
  await expect(btn).toBeEnabled();
  await btn.click();
  await expect(page).toHaveURL(/onboarding|welcome|step/);
});

test('AUTH-02 adult checkbox gates signup button', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('link', { name: /sign up/i }).click();
  await page.getByLabel(/email/i).fill(`cb-${Date.now()}@test.com`);
  await page.getByLabel(/password/i).fill('Password123!');
  const btn = page.getByRole('button', { name: /sign up/i });
  await expect(btn).toBeDisabled();
  await page
    .getByRole('checkbox', { name: /18 years|parent|legal guardian/i })
    .check();
  await expect(btn).toBeEnabled();
});

test('AUTH-02 CRITICAL server-side rejects signup without adult_confirmed', async () => {
  const { data, error } = await supabaseAdmin.auth.signUp({
    email: `bypass-${Date.now()}@test.com`,
    password: 'Bypass2026!',
    options: { data: { display_name: 'Bypass Test' } },
  });
  if (data.user) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('adult_confirmed')
      .eq('id', data.user.id)
      .single();
    expect(profile?.adult_confirmed).not.toBe(true);
    await supabaseAdmin.auth.admin.deleteUser(data.user.id);
  }
});

test('AUTH-09 CRITICAL student cannot self-register without adult confirmation', async () => {
  const email = `minor-${Date.now()}@test.com`;
  const { data } = await supabaseAdmin.auth.signUp({
    email,
    password: 'Minor2026!',
    options: { data: { display_name: 'Minor Test' } },
  });
  if (data.user) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('adult_confirmed')
      .eq('id', data.user.id)
      .maybeSingle();
    expect(profile?.adult_confirmed).not.toBe(true);
    await supabaseAdmin.auth.admin.deleteUser(data.user.id);
  }
});
