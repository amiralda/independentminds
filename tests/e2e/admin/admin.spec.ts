import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test('ADM-01 non-admin blocked from /admin', async ({ page }) => {
  await loginAs(page, 'parent');
  await page.goto('/admin');
  await expect(page).not.toHaveURL(/^https?:\/\/[^/]+\/admin\/?$/);
});

test('ADM-02 admin panel loads with 7 sections', async ({
  page,
}) => {
  await loginAs(page, 'admin');
  await expect(page).toHaveURL(/\/admin/);
  for (const s of [
    'Overview',
    'Students',
    'Engagement',
    'Rewards',
    'System',
    'Messages',
    'Users',
  ]) {
    await expect(
      page.getByRole('link', { name: new RegExp(s, 'i') })
    ).toBeVisible();
  }
});

test('ADM-03 overview shows metric cards', async ({ page }) => {
  await loginAs(page, 'admin');
  await page.goto('/admin');
  await expect(page.getByText(/total students/i)).toBeVisible({
    timeout: 8000,
  });
  await expect(page.getByText(/active today/i)).toBeVisible();
});

test('ADM-06 admin panel has no mutation buttons', async ({
  page,
}) => {
  await loginAs(page, 'admin');
  await page.goto('/admin/students');
  await expect(
    page.getByRole('button', {
      name: /^edit$|^delete$|^update$/i,
    })
  ).toHaveCount(0);
});

test('ADM-10 parent dashboard link in admin sidebar', async ({
  page,
}) => {
  await loginAs(page, 'admin');
  const link = page.getByRole('link', {
    name: /parent dashboard/i,
  });
  await expect(link).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(/parent\/dashboard/);
});
