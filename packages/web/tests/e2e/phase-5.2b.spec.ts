// Phase 5.2b E2E Tests - Run with Playwright
// Install: npm install -D @playwright/test
// Run: npx playwright test

import { test, expect } from '@playwright/test';

test.describe('Phase 5.2b - Svelte App Shell', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('should render Svelte header and tabs', async ({ page }) => {
    // Check header exists
    await expect(page.locator('text=🎵 Audio Analyzer')).toBeVisible();

    // Check tabs exist
    await expect(page.locator('text=📁 Local Files')).toBeVisible();
    await expect(page.locator('text=☁️ Google Drive')).toBeVisible();
    await expect(page.locator('text=📦 Box')).toBeVisible();
  });

  test('should switch tabs', async ({ page }) => {
    // Click Google Drive tab
    await page.click('text=☁️ Google Drive');

    // Check active state
    const driveTab = page.locator('text=☁️ Google Drive');
    await expect(driveTab).toHaveClass(/active/);

    // Check placeholder shows correct tab
    await expect(page.locator('text=Current Tab: googleDrive')).toBeVisible();
  });

  test('should toggle dark mode', async ({ page }) => {
    // Click dark mode toggle
    await page.click('[aria-label="Toggle dark mode"]');

    // Check data-theme attribute
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');

    // Toggle back
    await page.click('[aria-label="Toggle dark mode"]');
    await expect(html).toHaveAttribute('data-theme', 'light');
  });

  test('old functionality still works', async ({ page }) => {
    // Check file input exists
    await expect(page.locator('#fileInput')).toBeAttached();

    // Check drop zone exists
    await expect(page.locator('#dropZone')).toBeVisible();

    // Check preset selector works
    await expect(page.locator('#presetSelector')).toBeVisible();
  });

  test('no JavaScript errors on page load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));

    await page.reload();

    expect(errors).toHaveLength(0);
  });
});
