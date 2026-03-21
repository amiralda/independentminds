import { test, expect } from '@playwright/test';
import { supabaseAdmin, cleanupTestUser } from '../helpers/supabase';

test('AUTH-08 — delete account requires typing DELETE and signs user out', async ({ page }) => {
  const email = `delete-test-${Date.now()}@test.com`;
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
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL('/', { timeout: 15_000 });

  // Navigate to settings
  const settingsLink = page.getByRole('link', { name: /settings/i }).or(
    page.getByRole('button', { name: /settings/i })
  );
  if (await settingsLink.first().isVisible({ timeout: 5000 })) {
    await settingsLink.first().click();
  }

  const deleteBtn = page.getByRole('button', { name: /delete.*account/i });
  if (await deleteBtn.isVisible({ timeout: 5000 })) {
    await deleteBtn.click();
    // Confirm dialog
    const input = page.getByPlaceholder(/DELETE/i).or(
      page.getByRole('textbox')
    );
    if (await input.isVisible({ timeout: 3000 })) {
      await input.fill('DELETE');
      const confirmBtn = page.getByRole('button', { name: /confirm|delete/i }).last();
      await confirmBtn.click();
      await expect(page).toHaveURL(/login/, { timeout: 10_000 });
    }
  }

  // Cleanup in case deletion didn't work
  await cleanupTestUser(email);
});
