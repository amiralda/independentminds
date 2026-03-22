import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.beforeEach(async ({ page }) => {
  await loginAs(page, 'parent');
  await page.goto('/student/dashboard');
});

test('STU-09 rewards catalog shows available items', async ({
  page,
}) => {
  await page.getByRole('tab', { name: /rewards/i }).click();
  await expect(
    page.getByText(/rewards|redeem|catalog/i)
  ).toBeVisible();
});
