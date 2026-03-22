import { test, expect } from '@playwright/test';
import { supabaseAdmin } from '../helpers/supabase';

test('AUTH-08 delete account requires typing DELETE', async ({
  page,
}) => {
  const email = `delete-${Date.now()}@test.com`;
  await supabaseAdmin.auth.signUp({
    email,
    password: 'Delete2026!',
    options: {
      data: {
        display_name: 'Delete Me',
        adult_confirmed: true,
        adult_confirmed_at: new Date().toISOString(),
      },
    },
  });
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill('Delete2026!');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/parent\/dashboard/);
  await page.goto('/parent/settings');
  await page.getByRole('button', { name: /delete.*account/i }).click();
  const input = page.getByRole('textbox', {
    name: /type DELETE|confirm/i,
  });
  await expect(input).toBeVisible();
  const confirmBtn = page
    .getByRole('button', { name: /confirm|delete/i })
    .last();
  await expect(confirmBtn).toBeDisabled();
  await input.fill('DELETE');
  await expect(confirmBtn).toBeEnabled();
  await confirmBtn.click();
  await expect(page).toHaveURL(/login/, { timeout: 8000 });
});
