import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test('AUTH-03 unconfirmed adult blocked from parent dashboard', async ({
  page,
}) => {
  await page.goto('/parent/dashboard');
  const url = page.url();
  expect(url).not.toContain('/parent/dashboard');
  expect(
    url.includes('/login') ||
      url.includes('/confirm-adult') ||
      url.includes('/onboarding')
  ).toBe(true);
});

test('AUTH-10 unverified user redirected to login', async ({ page }) => {
  await page.goto('/parent/dashboard');
  await expect(page).toHaveURL(/login/);
});

test('Parent login redirects to dashboard', async ({ page }) => {
  await loginAs(page, 'parent');
  await expect(page).toHaveURL(/parent\/dashboard/);
});

test('Admin login redirects to admin panel', async ({ page }) => {
  await loginAs(page, 'admin');
  await expect(page).toHaveURL(/\/admin/);
});

test('Non-admin cannot access /admin', async ({ page }) => {
  await loginAs(page, 'parent');
  await page.goto('/admin');
  await expect(page).not.toHaveURL(/^.*\/admin\/?$/);
});
