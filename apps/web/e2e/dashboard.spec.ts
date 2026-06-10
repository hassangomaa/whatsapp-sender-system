import { test, expect } from '@playwright/test';

test('register, dashboard, create session', async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;

  await page.goto('/register');
  await page.getByPlaceholder('Your name').fill('E2E User');
  await page.getByPlaceholder('you@company.com').fill(email);
  await page.getByPlaceholder('Min. 8 characters').fill('E2ETest123!');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page).toHaveURL(/dashboard/);
  await expect(page.getByText('Welcome back')).toBeVisible();

  await page.goto('/sessions');
  await page.getByPlaceholder('Session name (e.g. TabletPOS)').fill('E2E Session');
  await page.getByRole('button', { name: 'Create session' }).click();
  await expect(page.getByText('E2E Session')).toBeVisible();
});
