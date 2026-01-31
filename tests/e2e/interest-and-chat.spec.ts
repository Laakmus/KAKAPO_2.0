import { expect, test } from '@playwright/test';
import { NewOfferPage } from './page-objects/NewOfferPage';
import { OfferDetailPage } from './page-objects/OfferDetailPage';
import { ChatPage } from './page-objects/ChatPage';
import { loginViaApi } from './helpers/auth';

const USER_A_EMAIL = process.env.E2E_USERNAME!;
const USER_A_PASSWORD = process.env.E2E_PASSWORD!;
const USER_B_EMAIL = process.env.E2E_USERNAME_2!;
const USER_B_PASSWORD = process.env.E2E_PASSWORD_2!;

test.describe('Interest & Chat Flow', () => {
  // This test requires two distinct users to interact.
  // It creates offers, expresses mutual interest, then verifies chat and realization.

  let offerAId: string;
  let offerBId: string;

  test('full interest and chat flow between two users', async ({ browser }) => {
    // --- Step 1: User A creates an offer ---
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await loginViaApi(pageA, USER_A_EMAIL, USER_A_PASSWORD);

    const uniqueSuffix = Date.now();
    const newOfferPageA = new NewOfferPage(pageA);
    await newOfferPageA.goto();
    await expect(newOfferPageA.form).toBeVisible({ timeout: 10_000 });

    await newOfferPageA.fillForm({
      title: `Offer A ${uniqueSuffix}`,
      description: 'Test offer from User A for mutual interest flow test by Playwright.',
      city: 'Kraków',
    });
    await newOfferPageA.submit();
    // Wait for redirect to offer detail (UUID pattern, not /offers/new or /offers/my)
    await expect(pageA).toHaveURL(/\/offers\/[0-9a-f]{8}-/, { timeout: 15_000 });
    offerAId = pageA.url().split('/offers/')[1];

    // --- Step 2: User B creates an offer ---
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await loginViaApi(pageB, USER_B_EMAIL, USER_B_PASSWORD);

    const newOfferPageB = new NewOfferPage(pageB);
    await newOfferPageB.goto();
    await expect(newOfferPageB.form).toBeVisible({ timeout: 10_000 });

    await newOfferPageB.fillForm({
      title: `Offer B ${uniqueSuffix}`,
      description: 'Test offer from User B for mutual interest flow test by Playwright.',
      city: 'Kraków',
    });
    await newOfferPageB.submit();
    await expect(pageB).toHaveURL(/\/offers\/[0-9a-f]{8}-/, { timeout: 15_000 });
    offerBId = pageB.url().split('/offers/')[1];

    // --- Step 3: User B expresses interest in User A's offer ---
    const detailPageB = new OfferDetailPage(pageB);
    await detailPageB.goto(offerAId);
    await expect(detailPageB.panel).toBeVisible({ timeout: 10_000 });
    await detailPageB.expressInterest();

    // Wait for the button to change to "Anuluj zainteresowanie"
    await expect(detailPageB.interestButton).toContainText('Anuluj', { timeout: 10_000 });

    // --- Step 4: User A expresses interest in User B's offer (creates mutual match → chat) ---
    const detailPageA = new OfferDetailPage(pageA);
    await detailPageA.goto(offerBId);
    await expect(detailPageA.panel).toBeVisible({ timeout: 10_000 });
    await detailPageA.expressInterest();

    await expect(detailPageA.interestButton).toContainText('Anuluj', { timeout: 10_000 });

    // --- Step 5: User A opens /chats — the SPA view selects chats inline ---
    await pageA.goto('/chats');
    await pageA.waitForLoadState('networkidle');

    // Click on the active (non-disabled) chat list item
    const chatItemA = pageA.locator('[role="button"]:not([aria-disabled="true"])').first();
    await expect(chatItemA).toBeVisible({ timeout: 10_000 });
    await chatItemA.click();

    // Wait for the message composer to appear (means chat detail loaded)
    const composerA = pageA.getByTestId('message-composer-textarea');
    await expect(composerA).toBeVisible({ timeout: 10_000 });

    // --- Step 6: User A sends a message ---
    const testMessage = `Hello from User A ${uniqueSuffix}`;
    await composerA.fill(testMessage);
    await pageA.getByTestId('message-composer-send').click();

    // Verify message appears in the messages list
    await expect(pageA.getByTestId('messages-list')).toContainText(testMessage, { timeout: 10_000 });

    // --- Step 7: User B opens /chats and sees the message ---
    await pageB.goto('/chats');
    await pageB.waitForLoadState('networkidle');

    const chatItemB = pageB.locator('[role="button"]:not([aria-disabled="true"])').first();
    await expect(chatItemB).toBeVisible({ timeout: 10_000 });
    await chatItemB.click();

    const composerB = pageB.getByTestId('message-composer-textarea');
    await expect(composerB).toBeVisible({ timeout: 10_000 });
    await expect(pageB.getByTestId('messages-list')).toContainText(testMessage, { timeout: 10_000 });

    // User B replies
    const replyMessage = `Reply from User B ${uniqueSuffix}`;
    await composerB.fill(replyMessage);
    await pageB.getByTestId('message-composer-send').click();
    await expect(pageB.getByTestId('messages-list')).toContainText(replyMessage, { timeout: 10_000 });

    // --- Step 8: User A confirms realization ---
    // Refresh to see realize button
    await pageA.reload();
    await pageA.waitForLoadState('networkidle');
    // Re-select the chat after reload
    const chatItemA2 = pageA.locator('[role="button"]:not([aria-disabled="true"])').first();
    await chatItemA2.click();
    await expect(pageA.getByTestId('message-composer-textarea')).toBeVisible({ timeout: 10_000 });

    const realizeA = pageA.getByTestId('realize-button');
    if (await realizeA.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await realizeA.click();
      await pageA.getByRole('button', { name: 'Potwierdzam' }).click();
      await pageA.waitForTimeout(2000);
    }

    // --- Step 9: User B confirms realization ---
    await pageB.reload();
    await pageB.waitForLoadState('networkidle');
    const chatItemB2 = pageB.locator('[role="button"]:not([aria-disabled="true"])').first();
    await chatItemB2.click();
    await expect(pageB.getByTestId('message-composer-textarea')).toBeVisible({ timeout: 10_000 });

    const realizeB = pageB.getByTestId('realize-button');
    if (await realizeB.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await realizeB.click();
      await pageB.getByRole('button', { name: 'Potwierdzam' }).click();
      await expect(pageB.locator('text=Zrealizowana')).toBeVisible({ timeout: 10_000 });
    }

    // --- Cleanup: Delete test offers ---
    // Delete User A's offer
    const tokenA = await pageA.evaluate(() => localStorage.getItem('access_token'));
    if (tokenA) {
      await pageA.request.delete(`/api/offers/${offerAId}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
    }

    // Delete User B's offer
    const tokenB = await pageB.evaluate(() => localStorage.getItem('access_token'));
    if (tokenB) {
      await pageB.request.delete(`/api/offers/${offerBId}`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
    }

    await contextA.close();
    await contextB.close();
  });
});
