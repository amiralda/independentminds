import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.beforeEach(async ({ page }) => {
  await loginAs(page, 'parent');
});

test('PAR-01 today schedule loads', async ({ page }) => {
  await page.goto('/parent/dashboard');
  await expect(page.getByText(/today|schedule/i)).toBeVisible();
  await expect(
    page
      .locator(
        '[data-testid="schedule-block"],[class*="block"],[class*="schedule"]'
      )
      .first()
  ).toBeVisible({ timeout: 8000 });
});

test('PAR-07 PDF report download button exists', async ({ page }) => {
  await page.goto('/parent/dashboard');
  await expect(
    page.getByRole('button', { name: /download report|export pdf/i })
  ).toBeVisible();
});

test('PAR-08 co-guardians is above students in sidebar', async ({
  page,
}) => {
  await page.goto('/parent/dashboard');
  const gBox = await page
    .getByRole('link', { name: /co.guardian/i })
    .boundingBox();
  const sBox = await page
    .getByRole('link', { name: /^students$/i })
    .boundingBox();
  expect(gBox!.y).toBeLessThan(sBox!.y);
});

test('PAR-09 notification settings label is correct', async ({
  page,
}) => {
  await page.goto('/parent/settings');
  await expect(
    page.getByText(/notification settings/i)
  ).toBeVisible();
  await expect(
    page.getByText(/^telegram settings$/i)
  ).not.toBeVisible();
});

test('PAR-10 admin link only visible for admin users (not parent)', async ({
  page,
}) => {
  await page.goto('/parent/dashboard');
  await expect(
    page.getByRole('link', { name: /admin panel/i })
  ).not.toBeVisible();
});
