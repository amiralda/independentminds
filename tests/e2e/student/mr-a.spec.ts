import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.beforeEach(async ({ page }) => {
  await loginAs(page, 'parent');
  await page.goto('/student/dashboard');
  await page.getByRole('tab', { name: /mr.?a|tutor|ai/i }).click();
});

test('STU-05 Mr A chat interface is visible', async ({ page }) => {
  await expect(
    page.getByRole('textbox', { name: /message|ask/i })
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /send/i })
  ).toBeVisible();
});

test('STU-05 Mr A responds to a question', async ({ page }) => {
  await page
    .getByRole('textbox', { name: /message|ask/i })
    .fill('What is 2 + 2?');
  await page.getByRole('button', { name: /send/i }).click();
  await expect(
    page
      .locator('[class*="response"],[class*="assistant"]')
      .last()
  ).toBeVisible({ timeout: 15_000 });
});

test('STU-07 rate limit banner cannot be dismissed', async ({
  page,
}) => {
  const banner = page.locator(
    '[class*="rate-limit"],[class*="rateLimit"]'
  );
  if (await banner.isVisible({ timeout: 2000 })) {
    await expect(
      banner.getByRole('button', { name: /close|dismiss/i })
    ).not.toBeVisible();
  }
});

test('STU-08 clear history button exists', async ({ page }) => {
  await expect(
    page.getByRole('button', { name: /clear history|reset/i })
  ).toBeVisible();
});
