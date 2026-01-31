import type { Locator, Page } from '@playwright/test';

export class SignupPage {
  readonly page: Page;
  readonly container: Locator;
  readonly form: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly submitButton: Locator;
  readonly emailError: Locator;
  readonly passwordError: Locator;
  readonly firstNameError: Locator;
  readonly lastNameError: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.getByTestId('signup-page');
    this.form = page.getByTestId('signup-form');
    this.emailInput = page.getByTestId('signup-email-input');
    this.passwordInput = page.getByTestId('signup-password-input');
    this.firstNameInput = page.getByTestId('signup-firstname-input');
    this.lastNameInput = page.getByTestId('signup-lastname-input');
    this.submitButton = page.getByTestId('signup-submit-button');
    this.emailError = page.getByTestId('signup-email-error');
    this.passwordError = page.getByTestId('signup-password-error');
    this.firstNameError = page.getByTestId('signup-firstname-error');
    this.lastNameError = page.getByTestId('signup-lastname-error');
  }

  async goto() {
    await this.page.goto('/signup');
  }

  async fillForm(data: { email: string; password: string; firstName: string; lastName: string }) {
    await this.emailInput.fill(data.email);
    await this.passwordInput.fill(data.password);
    await this.firstNameInput.fill(data.firstName);
    await this.lastNameInput.fill(data.lastName);
  }

  async submit() {
    await this.submitButton.click();
  }
}
