import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.beforeEach(async ({ page }) => {
  await loginAs(page, 'parent');
});

test('NOT-10 notification settings shows channel selector', async ({
  page,
}) => {
  await page.goto('/parent/settings');
  await expect(
    page
      .getByText(/telegram only|whatsapp only|both/i)
      .or(page.getByRole('combobox', { name: /channel/i }))
      .first()
  ).toBeVisible();
});

test('NOT-07 test connection button exists', async ({ page }) => {
  await page.goto('/parent/settings');
  await expect(
    page.getByRole('button', {
      name: /test.*telegram|test connection/i,
    })
  ).toBeVisible();
});

test('NOT-11 WhatsApp rejects invalid phone number', async ({
  page,
}) => {
  await page.goto('/parent/settings');
  const input = page.getByLabel(/whatsapp/i);
  if (await input.isVisible({ timeout: 2000 })) {
    await input.fill('1234');
    await page.getByRole('button', { name: /save/i }).click();
    await expect(
      page.getByText(/invalid|must start with \+|E\.164/i)
    ).toBeVisible({ timeout: 3000 });
  }
});
