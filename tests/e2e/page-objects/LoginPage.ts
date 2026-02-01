import type { Locator, Page } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly container: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly emailError: Locator;
  readonly passwordError: Locator;
  readonly signupLink: Locator;
  readonly form: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.getByTestId('login-page');
    this.form = page.getByTestId('login-form');
    this.emailInput = page.getByTestId('login-email-input');
    this.passwordInput = page.getByTestId('login-password-input');
    this.submitButton = page.getByTestId('login-submit-button');
    this.emailError = page.getByTestId('login-email-error');
    this.passwordError = page.getByTestId('login-password-error');
    this.signupLink = page.getByTestId('login-signup-link');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
