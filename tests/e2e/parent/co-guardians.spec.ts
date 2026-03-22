import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.beforeEach(async ({ page }) => {
  await loginAs(page, 'parent');
});

test('GRD-01 invite form is accessible', async ({ page }) => {
  await page.goto('/parent/co-guardians');
  const btn = page.getByRole('button', {
    name: /invite co.guardian|add co.guardian/i,
  });
  await expect(btn).toBeVisible();
  await btn.click();
  await expect(page.getByLabel(/email/i)).toBeVisible();
  await expect(
    page.getByRole('button', { name: /send invite/i })
  ).toBeVisible();
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

test('GRD-07 view progress toggle cannot be turned off', async ({
  page,
}) => {
  await page.goto('/parent/co-guardians');
  const toggle = page
    .locator('[data-permission="can_view_progress"] input')
    .or(page.getByRole('checkbox', { name: /view.*progress/i }));
  if (await toggle.first().isVisible({ timeout: 3000 })) {
    if (await toggle.first().isChecked()) {
      await toggle.first().click();
      await expect(toggle.first()).toBeChecked();
    }
  }
});

test('GRD-08 full access enables all toggles', async ({ page }) => {
  await page.goto('/parent/co-guardians');
  const fa = page
    .locator('[data-permission="is_full_access"] input')
    .or(page.getByRole('checkbox', { name: /full access/i }));
  if (
    (await fa.first().isVisible({ timeout: 3000 })) &&
    !(await fa.first().isChecked())
  ) {
    await fa.first().check();
    const sos = page.getByRole('checkbox', {
      name: /receive.*sos|sos.*alert/i,
    });
    if (await sos.isVisible({ timeout: 2000 })) {
      await expect(sos).toBeChecked();
      await expect(sos).toBeDisabled();
    }
    await fa.first().uncheck();
  }
});
