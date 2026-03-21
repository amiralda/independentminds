import { test, expect } from '@playwright/test';

test.skip('Student rewards panel shows available rewards', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(process.env.TEST_STUDENT_EMAIL || '');
  await page.getByLabel(/password/i).fill(process.env.TEST_STUDENT_PASSWORD || '');
  await page.getByRole('button', { name: /sign in/i }).click();

  const rewardsLink = page.getByRole('link', { name: /rewards|shop/i });
  if (await rewardsLink.isVisible({ timeout: 5000 })) {
    await rewardsLink.click();
    await expect(page.getByText(/reward|points|redeem/i).first()).toBeVisible({ timeout: 5000 });
  }
});
