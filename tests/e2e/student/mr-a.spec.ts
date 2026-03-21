import { test, expect } from '@playwright/test';

test.skip('Mr A chat interface loads', async ({ page }) => {
  // Requires student login with subject tracks configured
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(process.env.TEST_STUDENT_EMAIL || '');
  await page.getByLabel(/password/i).fill(process.env.TEST_STUDENT_PASSWORD || '');
  await page.getByRole('button', { name: /sign in/i }).click();
  
  const mrABtn = page.getByRole('button', { name: /mr.*a|tutor|chat/i });
  if (await mrABtn.isVisible({ timeout: 5000 })) {
    await mrABtn.click();
    await expect(page.getByPlaceholder(/message|ask/i)).toBeVisible({ timeout: 5000 });
  }
});
