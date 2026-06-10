import { test, expect } from '@playwright/test';

test('register, dashboard, create session', async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;

  await page.goto('/register');
  await page.getByPlaceholder('Name').fill('E2E User');
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password (min 8)').fill('E2ETest123!');
  await page.getByRole('button', { name: 'Register' }).click();

  await expect(page).toHaveURL(/dashboard/);
  await expect(page.getByText('Welcome back')).toBeVisible();

  await page.goto('/sessions');
  await page.getByPlaceholder('Session name').fill('E2E Session');
  await page.getByRole('button', { name: 'Create session' }).click();
  await expect(page.getByText('E2E Session')).toBeVisible();
});
