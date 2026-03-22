import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.beforeEach(async ({ page }) => {
  await loginAs(page, 'parent');
});

test('PAR-04 save as template button exists', async ({ page }) => {
  await page.goto('/parent/dashboard');
  await expect(
    page.getByRole('button', { name: /save as template/i })
  ).toBeVisible();
});

test('PAR-05 apply template shows built-in options', async ({
  page,
}) => {
  await page.goto('/parent/dashboard');
  await page
    .getByRole('button', { name: /apply template/i })
    .click();
  await expect(
    page.getByText(/elementary standard week/i)
  ).toBeVisible();
  await expect(
    page.getByText(/middle school standard week/i)
  ).toBeVisible();
  await expect(page.getByText(/flex schedule/i)).toBeVisible();
});

test('PAR-06 copy last week button exists', async ({ page }) => {
  await page.goto('/parent/dashboard');
  await expect(
    page.getByRole('button', { name: /copy last week/i })
  ).toBeVisible();
});
