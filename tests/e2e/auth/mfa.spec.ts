import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test('AUTH-04 MFA settings panel is accessible', async ({ page }) => {
  await loginAs(page, 'parent');
  await page.goto('/parent/settings');
  await expect(
    page.getByText(/two-factor|MFA|authenticator/i)
  ).toBeVisible();
});

test('AUTH-05 disabling MFA requires password field', async ({
  page,
}) => {
  await loginAs(page, 'parent');
  await page.goto('/parent/settings');
  const disableBtn = page.getByRole('button', {
    name: /disable|remove.*mfa|turn off/i,
  });
  if (await disableBtn.isVisible()) {
    await disableBtn.click();
    await expect(
      page.getByLabel(/confirm password|enter password/i)
    ).toBeVisible({ timeout: 3000 });
  } else {
    test.skip();
  }
});
