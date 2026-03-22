import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.beforeEach(async ({ page }) => {
  await loginAs(page, 'parent');
});

test('INB-01 inbox loads with all filter tabs', async ({ page }) => {
  await page.goto('/parent/inbox');
  for (const tab of [
    'All',
    'Unread',
    'SOS',
    'Lessons',
    'Rewards',
    'Streaks',
  ]) {
    await expect(
      page.getByRole('tab', { name: new RegExp(tab, 'i') })
    ).toBeVisible();
  }
});

test('INB-07 mark all read button exists', async ({ page }) => {
  await page.goto('/parent/inbox');
  await expect(
    page.getByRole('button', { name: /mark all.*read/i })
  ).toBeVisible();
});

test('INB-13 empty state shows when no messages', async ({
  page,
}) => {
  await page.goto('/parent/inbox');
  await page.getByRole('tab', { name: /unread/i }).click();
  const msgs = page.locator(
    '[class*="inbox-message"],[class*="message-card"]'
  );
  if ((await msgs.count()) === 0) {
    await expect(
      page.getByText(/no messages|empty|all caught up/i)
    ).toBeVisible();
  }
});
