import { expect, test } from '@playwright/test';

test('login page renders', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Logowanie' })).toBeVisible();
});

test('root redirects to /offers', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/offers$/);
});
