import { Page } from '@playwright/test';

export async function loginAs(page: Page, role: 'parent' | 'admin' | 'guardian') {
  const credentials = {
    parent:   { email: process.env.TEST_PARENT_EMAIL!,   password: process.env.TEST_PARENT_PASSWORD! },
    admin:    { email: process.env.TEST_ADMIN_EMAIL!,    password: process.env.TEST_ADMIN_PASSWORD! },
    guardian: { email: process.env.TEST_GUARDIAN_EMAIL!,  password: process.env.TEST_GUARDIAN_PASSWORD! },
  };
  const { email, password } = credentials[role];

  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL('/', { timeout: 15_000 });
}

export async function logout(page: Page) {
  await page.getByRole('button', { name: /log out|sign out/i }).click();
  await page.waitForURL('/login');
}
