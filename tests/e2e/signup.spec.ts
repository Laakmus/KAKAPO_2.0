import { expect, test } from '@playwright/test';
import { SignupPage } from './page-objects/SignupPage';

test.describe('Signup Page', () => {
  let signupPage: SignupPage;

  test.beforeEach(async ({ page }) => {
    signupPage = new SignupPage(page);
    await signupPage.goto();
  });

  test('should display form with all fields', async () => {
    await expect(signupPage.container).toBeVisible();
    await expect(signupPage.form).toBeVisible();
    await expect(signupPage.emailInput).toBeVisible();
    await expect(signupPage.passwordInput).toBeVisible();
    await expect(signupPage.firstNameInput).toBeVisible();
    await expect(signupPage.lastNameInput).toBeVisible();
    await expect(signupPage.submitButton).toBeVisible();
  });

  test('should show validation errors for empty submit', async () => {
    await signupPage.submit();

    await expect(signupPage.emailError).toBeVisible();
    await expect(signupPage.passwordError).toBeVisible();
    await expect(signupPage.firstNameError).toBeVisible();
    await expect(signupPage.lastNameError).toBeVisible();
  });

  test('should show validation error for invalid email', async () => {
    await signupPage.emailInput.fill('not-an-email');
    await signupPage.emailInput.blur();

    await expect(signupPage.emailError).toBeVisible();
  });

  test('should show validation error for short password', async () => {
    await signupPage.passwordInput.fill('1234');
    await signupPage.passwordInput.blur();

    await expect(signupPage.passwordError).toBeVisible();
  });

  test('should show validation error for missing first name', async () => {
    await signupPage.firstNameInput.focus();
    await signupPage.firstNameInput.blur();

    await expect(signupPage.firstNameError).toBeVisible();
  });

  test('should show validation error for missing last name', async () => {
    await signupPage.lastNameInput.focus();
    await signupPage.lastNameInput.blur();

    await expect(signupPage.lastNameError).toBeVisible();
  });

  test('should show error for duplicate email', async () => {
    const existingEmail = process.env.E2E_USERNAME!;

    await signupPage.fillForm({
      email: existingEmail,
      password: 'ValidPassword123',
      firstName: 'Test',
      lastName: 'User',
    });
    await signupPage.submit();

    // Expect email error from API (duplicate)
    await expect(signupPage.emailError).toBeVisible({ timeout: 10_000 });
  });
});
