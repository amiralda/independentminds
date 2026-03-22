import { Page } from '@playwright/test';

export async function loginAs(
  page: Page,
  role: 'parent' | 'admin' | 'guardian'
) {
  const creds = {
    parent: {
      email: process.env.TEST_PARENT_EMAIL!,
      password: process.env.TEST_PARENT_PASSWORD!,
    },
    admin: {
      email: process.env.TEST_ADMIN_EMAIL!,
      password: process.env.TEST_ADMIN_PASSWORD!,
    },
    guardian: {
      email: process.env.TEST_GUARDIAN_EMAIL!,
      password: process.env.TEST_GUARDIAN_PASSWORD!,
    },
  };
  const { email, password } = creds[role];
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/(parent|admin|student)\//);
}

export async function logout(page: Page) {
  await page.getByRole('button', { name: /log out/i }).click();
  await page.waitForURL('/login');
}
