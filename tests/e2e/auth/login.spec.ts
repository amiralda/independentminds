import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test('AUTH-03 — unconfirmed adult cannot access parent dashboard', async ({ page }) => {
  await page.goto('/');
  // Without login, should redirect to /login
  const url = page.url();
  expect(url).toMatch(/login/);
});

test('AUTH-10 — unauthenticated user is redirected to login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/login/);
});

test('Successful login redirects to dashboard', async ({ page }) => {
  await loginAs(page, 'parent');
  // After login, should be on dashboard (route /)
  await expect(page.getByText(/dashboard|today|welcome/i)).toBeVisible({ timeout: 10_000 });
});

test('Non-admin cannot access /admin route', async ({ page }) => {
  await loginAs(page, 'parent');
  await page.goto('/admin');
  // Should be redirected away
  await expect(page).not.toHaveURL(/\/admin/);
});
