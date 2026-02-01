import type { Locator, Page } from '@playwright/test';

export class ProfilePage {
  readonly page: Page;
  readonly container: Locator;
  readonly header: Locator;
  readonly stats: Locator;
  readonly firstName: Locator;
  readonly lastName: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator;
  readonly editForm: Locator;
  readonly editFirstName: Locator;
  readonly editLastName: Locator;
  readonly editSave: Locator;
  readonly editCancel: Locator;
  readonly changePasswordToggle: Locator;
  readonly changePasswordForm: Locator;
  readonly changePasswordCurrent: Locator;
  readonly changePasswordNew: Locator;
  readonly changePasswordConfirm: Locator;
  readonly changePasswordSubmit: Locator;
  readonly deleteDialog: Locator;
  readonly deletePassword: Locator;
  readonly deleteConfirm: Locator;
  readonly deleteCancel: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.getByTestId('profile-page');
    this.header = page.getByTestId('profile-header');
    this.stats = page.getByTestId('profile-stats');
    this.firstName = page.getByTestId('profile-first-name');
    this.lastName = page.getByTestId('profile-last-name');
    this.editButton = page.getByTestId('profile-edit-button');
    this.deleteButton = page.getByTestId('profile-delete-button');
    this.editForm = page.getByTestId('profile-edit-form');
    this.editFirstName = page.getByTestId('profile-edit-firstname');
    this.editLastName = page.getByTestId('profile-edit-lastname');
    this.editSave = page.getByTestId('profile-edit-save');
    this.editCancel = page.getByTestId('profile-edit-cancel');
    this.changePasswordToggle = page.getByTestId('profile-change-password-toggle');
    this.changePasswordForm = page.getByTestId('change-password-form');
    this.changePasswordCurrent = page.getByTestId('change-password-current');
    this.changePasswordNew = page.getByTestId('change-password-new');
    this.changePasswordConfirm = page.getByTestId('change-password-confirm');
    this.changePasswordSubmit = page.getByTestId('change-password-submit');
    this.deleteDialog = page.getByTestId('delete-account-dialog');
    this.deletePassword = page.getByTestId('delete-account-password');
    this.deleteConfirm = page.getByTestId('delete-account-confirm');
    this.deleteCancel = page.getByTestId('delete-account-cancel');
  }

  async goto() {
    await this.page.goto('/profile');
  }

  async editProfile(firstName: string, lastName: string) {
    await this.editButton.click();
    await this.editFirstName.clear();
    await this.editFirstName.fill(firstName);
    await this.editLastName.clear();
    await this.editLastName.fill(lastName);
    await this.editSave.click();
  }

  async openChangePassword() {
    await this.changePasswordToggle.click();
  }

  async changePassword(current: string, newPass: string, confirm: string) {
    await this.changePasswordCurrent.fill(current);
    await this.changePasswordNew.fill(newPass);
    await this.changePasswordConfirm.fill(confirm);
    await this.changePasswordSubmit.click();
  }

  async openDeleteDialog() {
    await this.deleteButton.click();
  }

  async cancelDelete() {
    await this.deleteCancel.click();
  }
}
