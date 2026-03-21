import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test('AUTH-04 — MFA settings panel is accessible', async ({ page }) => {
  await loginAs(page, 'parent');
  // Navigate to settings area
  const settingsLink = page.getByRole('link', { name: /settings/i }).or(
    page.getByRole('button', { name: /settings/i })
  );
  if (await settingsLink.first().isVisible({ timeout: 5000 })) {
    await settingsLink.first().click();
  }
  await expect(page.getByText(/two-factor|MFA|authenticator/i)).toBeVisible({ timeout: 5000 });
});
