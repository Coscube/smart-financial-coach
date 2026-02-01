import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('should display the dashboard page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Smart Financial Coach/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('should display financial stats cards', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Total Balance')).toBeVisible();
    await expect(page.getByText('Monthly Income')).toBeVisible();
    await expect(page.getByText('Monthly Expenses')).toBeVisible();
    await expect(page.getByText('Savings')).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('should navigate to Budget page', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Budget');
    await expect(page.getByRole('heading', { name: 'Budget' })).toBeVisible();
  });

  test('should navigate to Transactions page', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Transactions');
    await expect(page.getByRole('heading', { name: 'Transactions' })).toBeVisible();
  });

  test('should navigate to Goals page', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Goals');
    await expect(page.getByRole('heading', { name: 'Financial Goals' })).toBeVisible();
  });

  test('should navigate to Reports page', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Reports');
    await expect(page.getByRole('heading', { name: 'Financial Reports' })).toBeVisible();
  });

  test('should navigate to Settings page', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  });
});
