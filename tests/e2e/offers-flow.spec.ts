import { expect, test } from '@playwright/test';
import { OffersPage } from './page-objects/OffersPage';
import { NewOfferPage } from './page-objects/NewOfferPage';
import { MyOffersPage } from './page-objects/MyOffersPage';
import { loginViaApi } from './helpers/auth';

const E2E_USERNAME = process.env.E2E_USERNAME!;
const E2E_PASSWORD = process.env.E2E_PASSWORD!;

test.describe('Offers Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page, E2E_USERNAME, E2E_PASSWORD);
  });

  test('should display offers grid on /offers', async ({ page }) => {
    const offersPage = new OffersPage(page);
    await offersPage.goto();

    await expect(offersPage.container).toBeVisible({ timeout: 10_000 });
    await expect(offersPage.grid).toBeVisible({ timeout: 10_000 });

    const cards = offersPage.getOfferCards();
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
  });

  test('should filter offers by city', async ({ page }) => {
    const offersPage = new OffersPage(page);
    await offersPage.goto();

    await expect(offersPage.container).toBeVisible({ timeout: 10_000 });

    // Select a city filter
    await offersPage.filterByCity('Warszawa');

    // Wait for grid to update (brief delay for API call)
    await page.waitForTimeout(1000);

    // The grid should still be visible (may or may not have results)
    await expect(offersPage.filterCity).toHaveValue('Warszawa');
  });

  test('should create a new offer, verify it in my offers, then delete', async ({ page }) => {
    const uniqueTitle = `Test Offer ${Date.now()}`;
    const description = 'This is an automated test offer created by Playwright E2E tests for verification purposes.';

    // Create new offer
    const newOfferPage = new NewOfferPage(page);
    await newOfferPage.goto();
    await expect(newOfferPage.form).toBeVisible({ timeout: 10_000 });

    await newOfferPage.fillForm({
      title: uniqueTitle,
      description,
      city: 'Warszawa',
    });
    await newOfferPage.submit();

    // Wait for redirect to offer detail page
    await expect(page).toHaveURL(/\/offers\//, { timeout: 15_000 });

    // Verify offer appears in My Offers
    const myOffersPage = new MyOffersPage(page);
    await myOffersPage.goto();
    await expect(myOffersPage.container).toBeVisible({ timeout: 10_000 });

    // Find the card with our title
    const offerCards = myOffersPage.getOfferCards();
    await expect(offerCards.first()).toBeVisible({ timeout: 10_000 });

    const targetCard = page.getByTestId('my-offer-card').filter({ hasText: uniqueTitle });
    await expect(targetCard).toBeVisible({ timeout: 5_000 });

    // Delete the offer
    const deleteButton = targetCard.getByTestId('my-offer-delete-button');
    await deleteButton.click();

    // Confirm deletion in the dialog
    await page.getByRole('button', { name: /Usuń|Potwierdź/ }).click();

    // Verify offer is no longer visible
    await expect(targetCard).not.toBeVisible({ timeout: 10_000 });
  });
});
