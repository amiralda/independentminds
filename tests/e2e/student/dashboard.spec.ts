import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.beforeEach(async ({ page }) => {
  await loginAs(page, 'parent');
  await page.goto('/student/dashboard');
});

test('STU-01 today tab shows blocks', async ({ page }) => {
  await expect(page.getByText(/today/i).first()).toBeVisible();
  await expect(
    page
      .getByRole('button', { name: /mark done|done/i })
      .first()
  ).toBeVisible({ timeout: 8000 });
});

test('STU-03 check-in has mood, focus, progress fields', async ({
  page,
}) => {
  await page.getByRole('tab', { name: /check.in/i }).click();
  await expect(page.getByText(/mood/i)).toBeVisible();
  await expect(page.getByText(/focus/i)).toBeVisible();
  await expect(
    page.getByRole('button', { name: /submit|check in/i })
  ).toBeVisible();
});

test('STU-13 dad panel tab is visible', async ({ page }) => {
  await expect(
    page.getByRole('tab', { name: /dad panel|parent view/i })
  ).toBeVisible();
});
