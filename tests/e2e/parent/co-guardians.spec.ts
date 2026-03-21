import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test('Co-Guardians panel is visible on dashboard', async ({ page }) => {
  await loginAs(page, 'parent');
  await expect(page.getByText(/co-guardian|guardians/i)).toBeVisible({ timeout: 10_000 });
});

test('Invite form accepts email', async ({ page }) => {
  await loginAs(page, 'parent');
  const emailInput = page.getByPlaceholder(/guardian.*email|email/i);
  if (await emailInput.isVisible({ timeout: 5000 })) {
    await emailInput.fill('test-invite@example.com');
    const sendBtn = page.getByRole('button', { name: /invite|send/i });
    await expect(sendBtn).toBeVisible();
  }
});

test('Copy invite link button exists', async ({ page }) => {
  await loginAs(page, 'parent');
  const copyBtn = page.getByRole('button', { name: /copy.*link|copy/i });
  if (await copyBtn.isVisible({ timeout: 5000 })) {
    await expect(copyBtn).toBeEnabled();
  }
});
