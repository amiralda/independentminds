import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

// GRD-01/07/08 removed 2026-10-02: they targeted a /parent/co-guardians route,
// a "send invite" button and per-permission checkboxes that do not exist (the
// panel is a DadPanel tab, and the permission flags are not enforced by RLS).

test.beforeEach(async ({ page }) => {
  await loginAs(page, 'parent');
});

test('GRD-02 expired token returns error', async ({ page }) => {
  await page.goto(
    '/accept-invite?token=invalid-token-00000000'
  );
  await expect(
    page.getByText(/invalid|expired|not found/i)
  ).toBeVisible({ timeout: 8000 });
});

test('GRD-05 unauthenticated invite link redirects to login', async ({
  page,
}) => {
  await page.context().clearCookies();
  await page.goto('/accept-invite?token=sometoken123');
  await expect(page).toHaveURL(/login|signup/);
});
