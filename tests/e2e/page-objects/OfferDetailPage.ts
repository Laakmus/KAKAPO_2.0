import type { Locator, Page } from '@playwright/test';

export class OfferDetailPage {
  readonly page: Page;
  readonly panel: Locator;
  readonly interestButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.panel = page.getByTestId('offer-detail-panel');
    this.interestButton = page.getByTestId('interest-toggle-button');
  }

  async goto(id: string) {
    await this.page.goto(`/offers/${id}`);
  }

  async expressInterest() {
    await this.interestButton.click();
  }

  async cancelInterest() {
    await this.interestButton.click();
  }
}
