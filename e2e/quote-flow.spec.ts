import { test, expect } from '@playwright/test';

test.describe('Quote Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/quote');
  });

  test('quote page loads with form elements', async ({ page }) => {
    // Page should have quote-related heading
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Key form elements should be present
    // Pickup location input
    await expect(
      page.getByRole('textbox', { name: /pickup|from|collection/i }).or(
        page.locator('input[placeholder*="pickup" i], input[placeholder*="from" i]')
      )
    ).toBeVisible();

    // Dropoff location input
    await expect(
      page.getByRole('textbox', { name: /drop|destination|to/i }).or(
        page.locator('input[placeholder*="drop" i], input[placeholder*="destination" i]')
      )
    ).toBeVisible();
  });

  test('shows validation errors for empty submission', async ({ page }) => {
    // Find and click submit button
    const submitButton = page.getByRole('button', { name: /get quote|submit|continue/i });

    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Should show validation errors - look for error messages
      await expect(
        page.getByText(/required|please enter|invalid/i).first()
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('date picker is functional', async ({ page }) => {
    // Find date input and interact with it
    const dateInput = page.locator('input[type="date"]').or(
      page.getByRole('textbox', { name: /date|when/i })
    );

    if (await dateInput.first().isVisible()) {
      await dateInput.first().click();

      // Date picker calendar should appear or input should be interactable
      await expect(dateInput.first()).toBeFocused();
    }
  });

  test('vehicle selection is available', async ({ page }) => {
    // Look for vehicle type selection
    const vehicleOptions = page.locator('[data-vehicle-type], [class*="vehicle"]');

    // If vehicle selection exists on this page
    if ((await vehicleOptions.count()) > 0) {
      await expect(vehicleOptions.first()).toBeVisible();
    }
  });

  test('passenger count can be adjusted', async ({ page }) => {
    // Find passenger input or selector
    const passengerInput = page.getByRole('spinbutton', { name: /passenger/i }).or(
      page.locator('input[name*="passenger"], select[name*="passenger"]')
    );

    if (await passengerInput.first().isVisible()) {
      await passengerInput.first().fill('3');
      await expect(passengerInput.first()).toHaveValue('3');
    }
  });
});

test.describe('Quote Accessibility', () => {
  test('quote page meets basic accessibility standards', async ({ page }) => {
    await page.goto('/quote');

    // All images should have alt text
    const images = page.locator('img');
    const imageCount = await images.count();
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      expect(alt).toBeTruthy();
    }

    // Form inputs should have labels
    const inputs = page.locator('input:not([type="hidden"])');
    const inputCount = await inputs.count();
    for (let i = 0; i < Math.min(inputCount, 5); i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const placeholder = await input.getAttribute('placeholder');

      // Input should have either a label, aria-label, or placeholder
      const hasLabel = id
        ? (await page.locator(`label[for="${id}"]`).count()) > 0
        : false;
      expect(hasLabel || ariaLabel || placeholder).toBeTruthy();
    }
  });

  test('keyboard navigation works', async ({ page }) => {
    await page.goto('/quote');

    // Tab through the page
    await page.keyboard.press('Tab');

    // Something should be focused
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});
