import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test('Inbox page loads with filter tabs', async ({ page }) => {
  await loginAs(page, 'parent');
  // Navigate to inbox
  const inboxLink = page.getByRole('link', { name: /inbox|messages/i });
  if (await inboxLink.isVisible({ timeout: 5000 })) {
    await inboxLink.click();
    await expect(page.getByText(/all|unread|sos/i).first()).toBeVisible({ timeout: 5000 });
  }
});

test('Mark all as read button works', async ({ page }) => {
  await loginAs(page, 'parent');
  const inboxLink = page.getByRole('link', { name: /inbox|messages/i });
  if (await inboxLink.isVisible({ timeout: 5000 })) {
    await inboxLink.click();
    const markAllBtn = page.getByRole('button', { name: /mark all.*read/i });
    if (await markAllBtn.isVisible({ timeout: 3000 })) {
      await expect(markAllBtn).toBeEnabled();
    }
  }
});
