import { expect, test } from '@playwright/test';
import { LoginPage } from './page-objects/LoginPage';

const E2E_USERNAME = process.env.E2E_USERNAME!;
const E2E_PASSWORD = process.env.E2E_PASSWORD!;

test.describe('Login Page', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('should display login form with all elements', async () => {
    // Assert
    await expect(loginPage.container).toBeVisible();
    await expect(loginPage.form).toBeVisible();
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
    await expect(loginPage.signupLink).toBeVisible();
  });

  test('should show validation errors for empty fields', async () => {
    // Act
    await loginPage.submitButton.click();

    // Assert
    await expect(loginPage.emailError).toBeVisible();
    await expect(loginPage.passwordError).toBeVisible();
  });

  test('should show validation error for invalid email format', async () => {
    // Arrange
    await loginPage.emailInput.fill('not-an-email');
    await loginPage.emailInput.blur();

    // Assert
    await expect(loginPage.emailError).toBeVisible();
  });

  test('should show validation error for short password', async () => {
    // Arrange
    await loginPage.passwordInput.fill('12345');
    await loginPage.passwordInput.blur();

    // Assert
    await expect(loginPage.passwordError).toBeVisible();
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    // Act
    await loginPage.login(E2E_USERNAME, E2E_PASSWORD);

    // Assert
    await expect(page).toHaveURL(/\/offers/, { timeout: 10_000 });
  });

  test('should show error for invalid credentials', async () => {
    // Act
    await loginPage.login('nonexistent@test.com', 'wrongpassword123');

    // Assert - wait for API response and error display
    await expect(loginPage.emailError.or(loginPage.passwordError)).toBeVisible({ timeout: 5_000 });
  });

  test('should have signup link pointing to /signup', async () => {
    // Assert
    await expect(loginPage.signupLink).toHaveAttribute('href', '/signup');
  });

  test('should disable form while submitting', async () => {
    // Act
    await loginPage.emailInput.fill(E2E_USERNAME);
    await loginPage.passwordInput.fill(E2E_PASSWORD);
    await loginPage.submitButton.click();

    // Assert - button should be disabled during request
    await expect(loginPage.submitButton).toBeDisabled();
  });
});
