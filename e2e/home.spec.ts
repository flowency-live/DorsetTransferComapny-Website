import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('loads successfully with key elements', async ({ page }) => {
    await page.goto('/');

    // Check page title or header is present
    await expect(page).toHaveTitle(/dorset/i);

    // Navigation should be visible
    await expect(page.getByRole('navigation')).toBeVisible();

    // Main content area should be visible
    await expect(page.locator('main')).toBeVisible();
  });

  test('navigation links work', async ({ page }) => {
    await page.goto('/');

    // Click on quote link if present
    const quoteLink = page.getByRole('link', { name: /quote|book/i }).first();
    if (await quoteLink.isVisible()) {
      await quoteLink.click();
      await expect(page).toHaveURL(/quote/);
    }
  });

  test('is responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Page should still be functional
    await expect(page.locator('body')).toBeVisible();

    // Check mobile navigation (hamburger menu) if applicable
    const mobileMenu = page.getByRole('button', { name: /menu/i });
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
      // Navigation should appear
      await expect(page.getByRole('navigation')).toBeVisible();
    }
  });

  test('footer is present with key information', async ({ page }) => {
    await page.goto('/');

    // Scroll to footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Footer should contain contact or company info
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });
});
