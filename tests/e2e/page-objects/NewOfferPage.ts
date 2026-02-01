import type { Locator, Page } from '@playwright/test';

export class NewOfferPage {
  readonly page: Page;
  readonly form: Locator;
  readonly titleInput: Locator;
  readonly descriptionInput: Locator;
  readonly citySelect: Locator;
  readonly submitButton: Locator;
  readonly titleError: Locator;
  readonly descriptionError: Locator;

  constructor(page: Page) {
    this.page = page;
    this.form = page.getByTestId('offer-form');
    this.titleInput = page.getByTestId('offer-title-input');
    this.descriptionInput = page.getByTestId('offer-description-input');
    this.citySelect = page.getByTestId('offer-city-select');
    this.submitButton = page.getByTestId('offer-submit-button');
    this.titleError = page.getByTestId('offer-title-error');
    this.descriptionError = page.getByTestId('offer-description-error');
  }

  async goto() {
    await this.page.goto('/offers/new');
  }

  async fillForm(data: { title: string; description: string; city: string }) {
    await this.titleInput.fill(data.title);
    await this.descriptionInput.fill(data.description);
    // CitySelect is a shadcn Select - click trigger then select option
    await this.citySelect.click();
    await this.page.getByRole('option', { name: data.city }).click();
  }

  async submit() {
    await this.submitButton.click();
  }
}
