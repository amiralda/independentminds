import { test, expect } from '@playwright/test';
import { cleanupTestUser, supabaseAdmin } from '../helpers/supabase';

test('AUTH-06 5-step onboarding has progress indicator', async ({
  page,
}) => {
  const email = `onboard-${Date.now()}@test.com`;
  await page.goto('/login');
  await page.getByRole('link', { name: /sign up/i }).click();
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill('Onboard2026!');
  await page.getByLabel(/display name/i).fill('Onboard User');
  await page
    .getByRole('checkbox', { name: /18 years|parent|legal guardian/i })
    .check();
  await page.getByRole('button', { name: /sign up/i }).click();
  await expect(
    page.getByText(/step 1|1 of 5|welcome/i)
  ).toBeVisible({ timeout: 8000 });
  await expect(
    page
      .locator(
        '[role="progressbar"],.progress,[class*="progress"]'
      )
      .first()
  ).toBeVisible();
  await cleanupTestUser(email);
});

test('AUTH-07 onboarding_step defaults to 1 in DB', async () => {
  const email = `step-${Date.now()}@test.com`;
  const { data } = await supabaseAdmin.auth.signUp({
    email,
    password: 'Step2026!',
    options: {
      data: {
        display_name: 'Step User',
        adult_confirmed: true,
        adult_confirmed_at: new Date().toISOString(),
      },
    },
  });
  if (data.user) {
    const { data: p } = await supabaseAdmin
      .from('profiles')
      .select('onboarding_step')
      .eq('id', data.user.id)
      .single();
    expect(p?.onboarding_step).toBe(1);
    await supabaseAdmin.auth.admin.deleteUser(data.user.id);
  }
});
