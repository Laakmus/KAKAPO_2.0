import { expect, test } from '@playwright/test';
import { ProfilePage } from './page-objects/ProfilePage';
import { loginViaApi } from './helpers/auth';

const E2E_USERNAME = process.env.E2E_USERNAME!;
const E2E_PASSWORD = process.env.E2E_PASSWORD!;

test.describe('Profile Page', () => {
  let profilePage: ProfilePage;

  test.beforeEach(async ({ page }) => {
    await loginViaApi(page, E2E_USERNAME, E2E_PASSWORD, '/profile');
    profilePage = new ProfilePage(page);
  });

  test('should display profile data', async () => {
    await expect(profilePage.container).toBeVisible({ timeout: 10_000 });
    await expect(profilePage.header).toBeVisible();
    await expect(profilePage.stats).toBeVisible();
    await expect(profilePage.firstName).toBeVisible();
    await expect(profilePage.lastName).toBeVisible();
    await expect(profilePage.editButton).toBeVisible();
  });

  test('should edit profile and save', async () => {
    await expect(profilePage.container).toBeVisible({ timeout: 10_000 });

    // Store original values
    const originalFirstName = await profilePage.firstName.textContent();
    const originalLastName = await profilePage.lastName.textContent();

    // Edit with temporary values
    const tempFirstName = `Test${Date.now()}`;
    await profilePage.editProfile(tempFirstName, originalLastName!);

    // Verify updated value
    await expect(profilePage.firstName).toHaveText(tempFirstName, { timeout: 5_000 });

    // Restore original values
    await profilePage.editProfile(originalFirstName!, originalLastName!);
    await expect(profilePage.firstName).toHaveText(originalFirstName!, { timeout: 5_000 });
  });

  test('should open and close change password form', async () => {
    await expect(profilePage.container).toBeVisible({ timeout: 10_000 });

    await profilePage.openChangePassword();
    await expect(profilePage.changePasswordForm).toBeVisible();

    await profilePage.changePasswordToggle.click();
    await expect(profilePage.changePasswordForm).not.toBeVisible();
  });

  test('should show error for wrong current password', async () => {
    await expect(profilePage.container).toBeVisible({ timeout: 10_000 });

    await profilePage.openChangePassword();
    await profilePage.changePassword('wrongpassword', 'NewPass12345', 'NewPass12345');

    // Expect an error message to appear
    await expect(profilePage.page.locator('.text-destructive, .text-red-600, [role="alert"]')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('should open and cancel delete account dialog', async () => {
    await expect(profilePage.container).toBeVisible({ timeout: 10_000 });

    await profilePage.openDeleteDialog();
    await expect(profilePage.deleteDialog).toBeVisible();

    await profilePage.cancelDelete();
    await expect(profilePage.deleteDialog).not.toBeVisible();
  });
});
