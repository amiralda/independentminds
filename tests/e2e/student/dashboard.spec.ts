import { test, expect } from '@playwright/test';

// Student dashboard tests — require student login
test.skip('Student dashboard loads for student role', async ({ page }) => {
  // Requires student account setup
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(process.env.TEST_STUDENT_EMAIL || '');
  await page.getByLabel(/password/i).fill(process.env.TEST_STUDENT_PASSWORD || '');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByText(/today|check-in|badges/i)).toBeVisible({ timeout: 10_000 });
});
