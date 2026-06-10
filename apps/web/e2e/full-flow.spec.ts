import { test, expect } from '@playwright/test';

test.describe('Full integration flow', () => {
  test('register → session → QR mock → docs playground URLs', async ({ page }) => {
    const email = `flow-${Date.now()}@example.com`;
    const password = 'FlowTest123!';

    await page.goto('/register');
    await page.getByPlaceholder('Your name').fill('Flow Test');
    await page.getByPlaceholder('you@company.com').fill(email);
    await page.getByPlaceholder('Min. 8 characters').fill(password);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL(/dashboard/);

    await page.goto('/getting-started');
    await expect(page.getByText('Live API base URL')).toBeVisible();

    await page.goto('/sessions');
    await page.getByPlaceholder('Session name (e.g. TabletPOS)').fill('Flow Session');
    await page.getByRole('button', { name: 'Create session' }).click();
    await expect(page.getByText('Save your API key')).toBeVisible();

    await page.getByText('Flow Session').click();
    await page.getByRole('button', { name: 'Init / QR' }).click();
    await expect(page.getByText(/QR|connected/i).first()).toBeVisible({ timeout: 15000 });

    await page.goto('/docs');
    await expect(page.getByText('API playground')).toBeVisible();
    await expect(page.getByText('http://localhost:3010', { exact: true })).toBeVisible();
  });
});
