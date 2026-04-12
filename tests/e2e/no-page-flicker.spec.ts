import { expect, test } from '@playwright/test';
import { loginViaApi } from './helpers/auth';

const E2E_USERNAME = process.env.E2E_USERNAME!;
const E2E_PASSWORD = process.env.E2E_PASSWORD!;

test.describe('No page flicker on button interactions', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page, E2E_USERNAME, E2E_PASSWORD);
  });

  test('filter buttons on My Offers page should not cause page reload', async ({ page }) => {
    await page.goto('/offers/my');
    await page.waitForLoadState('networkidle');

    // Wait for page content to load
    const myOffersPage = page.getByTestId('my-offers-page');
    await expect(myOffersPage).toBeVisible({ timeout: 10_000 });

    // Set up a flag to detect full page reload
    await page.evaluate(() => {
      (window as unknown as Record<string, boolean>).__NO_RELOAD_FLAG = true;
    });

    // Click "Usunięte" filter button
    const removedButton = page.getByTestId('my-offers-status-removed');
    await removedButton.click();

    // Wait for UI to update
    await page.waitForTimeout(500);

    // If page reloaded, the flag would be gone
    const flagStillPresent = await page.evaluate(() => {
      return (window as unknown as Record<string, boolean>).__NO_RELOAD_FLAG === true;
    });

    expect(flagStillPresent).toBe(true);

    // Click "Aktywne" filter button
    const activeButton = page.getByTestId('my-offers-status-active');
    await activeButton.click();

    await page.waitForTimeout(500);

    const flagAfterSecondClick = await page.evaluate(() => {
      return (window as unknown as Record<string, boolean>).__NO_RELOAD_FLAG === true;
    });

    expect(flagAfterSecondClick).toBe(true);
  });

  test('selecting offer in detail view should not reload page (pushState)', async ({ page }) => {
    await page.goto('/offers');
    await page.waitForLoadState('networkidle');

    // Wait for offer cards to appear
    const offerCards = page.getByTestId('offer-card');
    await expect(offerCards.first()).toBeVisible({ timeout: 10_000 });

    // Navigate to first offer detail page
    const firstCard = offerCards.first();
    await firstCard.hover();
    const detailLink = firstCard.locator('a[href*="/offers/"]');
    await detailLink.click();

    // Wait for detail page to load
    await page.waitForURL(/\/offers\/.+/, { timeout: 5000 });
    await page.waitForLoadState('networkidle');

    // Now we're on the offer detail page (master-detail view)
    // Set reload detection flag
    await page.evaluate(() => {
      (window as unknown as Record<string, boolean>).__NO_RELOAD_FLAG = true;
    });

    // Find another offer in the sidebar list and click it
    const listOfferCards = page.getByTestId('offer-card');
    const secondCard = listOfferCards.nth(1);

    if (await secondCard.isVisible()) {
      await secondCard.click();

      // Wait for detail panel to update
      await page.waitForTimeout(1000);

      // URL should have changed (pushState)
      await expect(page).toHaveURL(/\/offers\/.+/);

      // Page should NOT have reloaded - flag should still be present
      const flagPresent = await page.evaluate(() => {
        return (window as unknown as Record<string, boolean>).__NO_RELOAD_FLAG === true;
      });

      expect(flagPresent).toBe(true);
    }
  });

  test('buttons with onClick outside forms have type="button"', async ({ page }) => {
    await page.goto('/offers');
    await page.waitForLoadState('networkidle');

    // Check that all buttons outside forms have type="button"
    const buttonsWithoutType = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons
        .filter((btn) => {
          const isInForm = btn.closest('form') !== null;
          return !isInForm && btn.type === 'submit';
        })
        .map((btn) => ({
          text: btn.textContent?.trim().substring(0, 50),
          type: btn.type,
          testId: btn.getAttribute('data-testid'),
        }));
    });

    expect(buttonsWithoutType).toEqual([]);
  });

  test('buttons inside forms correctly have type="submit"', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Wait for login form
    const loginForm = page.getByTestId('login-form');
    await expect(loginForm).toBeVisible({ timeout: 10_000 });

    // The submit button inside the form should have type="submit"
    const submitButton = page.getByTestId('login-submit-button');
    const buttonType = await submitButton.getAttribute('type');

    expect(buttonType).toBe('submit');
  });
});
