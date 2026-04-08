import { test, expect } from '@playwright/test';

test.describe('Parse Page', () => {
  test('loads and shows upload area', async ({ page }) => {
    await page.goto('/parse');
    await expect(page.locator('body')).toBeVisible();
    // Page should have a file upload area
    const uploadArea = page.locator('input[type="file"], [class*="upload"], [class*="drop"]').first();
    await expect(uploadArea).toBeAttached();
  });
});

test.describe('Batch Page', () => {
  test('loads and shows batch upload interface', async ({ page }) => {
    await page.goto('/parse/batch');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Evaluation List', () => {
  test('loads and shows evaluation page', async ({ page }) => {
    await page.goto('/evaluation');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('API Overview', () => {
  test('loads API management page', async ({ page }) => {
    await page.goto('/api');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Health Check', () => {
  test('backend health endpoint returns ok', async ({ request }) => {
    const response = await request.get('http://localhost:3001/api/health');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.status).toBe('ok');
  });
});
