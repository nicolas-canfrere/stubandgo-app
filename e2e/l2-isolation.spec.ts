import { expect, test } from '@playwright/test';
import { signIn } from './keycloak.ts';
import { DEMO_EVENT } from './stack.ts';

test('testControllerOfAnotherOrganizationDoesNotSeeTheEvent: Théâtre de la Ville has no Rock Asso event', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('link', { name: "Contrôle d'accès" }).click();
  await signIn(page, 'controleur.theatre');

  await expect(page.getByRole('heading', { level: 1, name: "Contrôle d'accès" })).toBeVisible();
  await expect(page.getByText(/^Organisation contrôlée : /)).toBeVisible();
  await expect(page.getByLabel('Événement contrôlé')).toBeVisible();
  await expect(page.getByRole('option', { name: /^Le Malade imaginaire — / })).toHaveCount(1);
  await expect(page.getByRole('option', { name: new RegExp(`^${DEMO_EVENT} — `) })).toHaveCount(0);
});

test('testOrganizationAdminIsNotController: admin.rock is refused the scan desk', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('link', { name: "Contrôle d'accès" }).click();
  await signIn(page, 'admin.rock');

  await expect(page.getByRole('alert')).toHaveText("Votre compte n'a pas le rôle de contrôleur.");
  await expect(page.getByLabel('Événement contrôlé')).toHaveCount(0);
});

test('testSignOutReturnsHome: signing out lands on the home page with « Se connecter »', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await signIn(page, 'controleur.rock');
  await page.getByRole('button', { name: 'Se déconnecter' }).click();

  await expect(page).toHaveURL('http://localhost:5173/');
  await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible();
});
