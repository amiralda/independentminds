import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test('Parent dashboard loads with student selector', async ({ page }) => {
  await loginAs(page, 'parent');
  await expect(page.getByText(/select student|students/i).or(
    page.getByRole('combobox')
  )).toBeVisible({ timeout: 10_000 });
});

test('Category cards display on dashboard', async ({ page }) => {
  await loginAs(page, 'parent');
  await expect(page.getByText(/core academics|creative|life skills/i)).toBeVisible({ timeout: 10_000 });
});

test('Activity feed shows entries', async ({ page }) => {
  await loginAs(page, 'parent');
  // Activity feed should be present on dashboard
  await expect(page.getByText(/activity|recent|feed/i).first()).toBeVisible({ timeout: 10_000 });
});
