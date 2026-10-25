import { type Page } from '@playwright/test';

/** Password shared by every demo account (see the API's Keycloak realm export). */
export const DEMO_PASSWORD = 'stubandgo-demo';

/**
 * Signs in through the real Keycloak form. Call it right after the page started the redirect
 * (the « Contrôle d'accès » link or « Se connecter »): it waits for the form, submits it, and
 * waits for the return to the front. Keycloak may ask for the username and the password on one
 * page or on two successive ones; both are handled.
 */
export async function signIn(page: Page, username: string): Promise<void> {
  await page.locator('#username').fill(username);
  const password = page.locator('#password');
  if (!(await password.isVisible())) {
    await page.locator('#kc-login').click();
  }
  await password.fill(DEMO_PASSWORD);
  await page.locator('#kc-login').click();
  await page.waitForURL(/^http:\/\/localhost:5173\//);
}
