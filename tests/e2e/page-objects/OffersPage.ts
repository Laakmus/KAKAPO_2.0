import type { Locator, Page } from '@playwright/test';

export class OffersPage {
  readonly page: Page;
  readonly container: Locator;
  readonly grid: Locator;
  readonly searchInput: Locator;
  readonly filterCity: Locator;
  readonly filterSort: Locator;
  readonly filterOrder: Locator;
  readonly filterClear: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.getByTestId('offers-page');
    this.grid = page.getByTestId('offers-grid');
    this.searchInput = page.getByTestId('offers-search-input');
    this.filterCity = page.getByTestId('offers-filter-city');
    this.filterSort = page.getByTestId('offers-filter-sort');
    this.filterOrder = page.getByTestId('offers-filter-order');
    this.filterClear = page.getByTestId('offers-filter-clear');
  }

  async goto() {
    await this.page.goto('/offers');
  }

  async filterByCity(city: string) {
    await this.filterCity.selectOption(city);
  }

  async search(query: string) {
    await this.searchInput.fill(query);
  }

  getOfferCards() {
    return this.page.getByTestId('offer-card');
  }
}
