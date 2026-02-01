import type { Locator, Page } from '@playwright/test';

export class ChatPage {
  readonly page: Page;
  readonly container: Locator;
  readonly headerUsername: Locator;
  readonly messagesList: Locator;
  readonly composerTextarea: Locator;
  readonly composerSend: Locator;
  readonly statusControls: Locator;
  readonly realizeButton: Locator;
  readonly unrealizeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.getByTestId('chat-details-page');
    this.headerUsername = page.getByTestId('chat-header-username');
    this.messagesList = page.getByTestId('messages-list');
    this.composerTextarea = page.getByTestId('message-composer-textarea');
    this.composerSend = page.getByTestId('message-composer-send');
    this.statusControls = page.getByTestId('chat-status-controls');
    this.realizeButton = page.getByTestId('realize-button');
    this.unrealizeButton = page.getByTestId('unrealize-button');
  }

  async goto(chatId: string) {
    await this.page.goto(`/chats/${chatId}`);
  }

  async sendMessage(text: string) {
    await this.composerTextarea.fill(text);
    await this.composerSend.click();
  }

  async confirmRealization() {
    await this.realizeButton.click();
    // Confirm in the alert dialog
    await this.page.getByRole('button', { name: 'Potwierdzam' }).click();
  }
}
