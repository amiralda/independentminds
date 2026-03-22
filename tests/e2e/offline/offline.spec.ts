import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test('OFF-01 offline banner appears when network disabled', async ({
  page,
  context,
}) => {
  await loginAs(page, 'parent');
  await page.goto('/student/dashboard');
  await context.setOffline(true);
  await page.waitForTimeout(1000);
  await expect(
    page.getByText(/offline|no connection|reconnect/i)
  ).toBeVisible({ timeout: 5000 });
  await context.setOffline(false);
});

test('OFF-04 sync message appears on reconnect', async ({
  page,
  context,
}) => {
  await loginAs(page, 'parent');
  await page.goto('/student/dashboard');
  await context.setOffline(true);
  await page.waitForTimeout(500);
  await context.setOffline(false);
  await expect(
    page.getByText(/syncing|reconnected|back online|synced/i)
  ).toBeVisible({ timeout: 8000 });
});

test('OFF-06 PWA manifest exists', async ({ page }) => {
  await page.goto('/');
  const manifest = page.locator('link[rel="manifest"]');
  await expect(manifest).toHaveCount(1);
  const href = await manifest.getAttribute('href');
  expect(href).toBeTruthy();
});
