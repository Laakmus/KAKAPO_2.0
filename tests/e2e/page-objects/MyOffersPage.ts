import type { Locator, Page } from '@playwright/test';

export class MyOffersPage {
  readonly page: Page;
  readonly container: Locator;
  readonly statusActive: Locator;
  readonly statusRemoved: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.getByTestId('my-offers-page');
    this.statusActive = page.getByTestId('my-offers-status-active');
    this.statusRemoved = page.getByTestId('my-offers-status-removed');
  }

  async goto() {
    await this.page.goto('/offers/my');
  }

  getOfferCards() {
    return this.page.getByTestId('my-offer-card');
  }

  getEditButtons() {
    return this.page.getByTestId('my-offer-edit-button');
  }

  getDeleteButtons() {
    return this.page.getByTestId('my-offer-delete-button');
  }
}
