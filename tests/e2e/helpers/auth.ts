import type { Page } from '@playwright/test';

/**
 * Login via API and store tokens in localStorage, then navigate to a page.
 *
 * This avoids repeating the login UI flow in every test.
 */
export async function loginViaApi(page: Page, email: string, password: string, navigateTo = '/offers') {
  // Call the login API directly
  const response = await page.request.post('/api/auth/login', {
    data: { email, password },
  });

  if (!response.ok()) {
    throw new Error(`Login API failed with status ${response.status()}: ${await response.text()}`);
  }

  const data = await response.json();
  const accessToken = data.access_token;
  const refreshToken = data.refresh_token;

  if (!accessToken) {
    throw new Error('Login API did not return access_token');
  }

  // Navigate to a page first (needed to set localStorage on the correct origin)
  await page.goto(navigateTo);

  // Store tokens in localStorage (matching the app's auth storage pattern)
  await page.evaluate(
    ({ token, refresh }) => {
      localStorage.setItem('access_token', token);
      if (refresh) localStorage.setItem('refresh_token', refresh);
    },
    { token: accessToken, refresh: refreshToken },
  );

  // Reload to pick up the stored tokens
  await page.reload();
  await page.waitForLoadState('networkidle');

  return { accessToken, refreshToken };
}
