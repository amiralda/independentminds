import { test, expect } from '@playwright/test';

test('COM-01 privacy policy accessible without auth', async ({
  page,
}) => {
  await page.goto('/privacy');
  await expect(page).not.toHaveURL(/login/);
  await expect(
    page.getByText(/privacy|confidentialité|COPPA/i)
  ).toBeVisible();
});

test('COM-02 terms accessible without auth', async ({ page }) => {
  await page.goto('/terms');
  await expect(page).not.toHaveURL(/login/);
  await expect(
    page.getByText(/terms|conditions|FERPA/i)
  ).toBeVisible();
});

test('COM-07 no analytics scripts loaded', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (req) => requests.push(req.url()));
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const trackers = requests.filter(
    (u) =>
      u.includes('google-analytics') ||
      u.includes('gtag') ||
      u.includes('facebook') ||
      u.includes('hotjar') ||
      u.includes('mixpanel')
  );
  expect(trackers).toHaveLength(0);
});
