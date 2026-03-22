import { test, expect } from '@playwright/test';

test('I18-01 language dropdown has 10 options on login page', async ({
  page,
}) => {
  await page.goto('/login');
  const sel = page.locator('select').first();
  await expect(sel).toBeVisible({ timeout: 5000 });
  const opts = await sel.locator('option').count();
  expect(opts).toBeGreaterThanOrEqual(10);
});

test('I18-01 dropdown includes EN HT FR ES', async ({ page }) => {
  await page.goto('/login');
  const text = await page.locator('select').first().innerText();
  expect(text).toContain('English');
  expect(text).toMatch(/Fran[cç]ais|French/);
  expect(text).toMatch(/Espa[nñ]ol|Spanish/);
  expect(text).toMatch(/Krey[oò]l|Haitian/);
});

test('I18-03 switching to FR shows French UI', async ({ page }) => {
  await page.goto('/login');
  const sel = page.locator('select').first();
  await sel.selectOption({ label: /Fran/ });
  await page.waitForTimeout(800);
  await expect(
    page.getByText(/bon retour|connexion|se connecter/i)
  ).toBeVisible();
});

test('I18-02 language preference persists after reload', async ({
  page,
}) => {
  await page.goto('/login');
  const sel = page.locator('select').first();
  await sel.selectOption({ label: /Krey/ });
  await page.reload();
  const val = await page.locator('select').first().inputValue();
  expect(val).toBe('ht');
});
