import { expect, test } from '@playwright/test';
import { DEMO_PASSWORD, signIn } from './keycloak.ts';
import { latestMessageTo, linkContaining } from './support/mailpit.ts';

test('testL3BackofficeFlow: platform creates and invites, admin publishes, a buyer pays, sales lock the event', async ({
  page,
  request,
}) => {
  // Keycloak and the database persist between runs: everything is suffixed with a run identifier.
  const run = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const organizationName = `Jazz Club ${run}`;
  const slug = `jazz-club-${run}`;
  const adminEmail = `gerant-${run}@jazz-club.test`;
  const buyerEmail = `acheteur-${run}@example.com`;
  const eventTitle = `Soirée Jazz ${run}`;

  // 1. The platform administrator creates the organization (3 %): it appears active.
  await page.goto('/plateforme');
  await signIn(page, 'admin.plateforme');
  await expect(page.getByRole('heading', { level: 1, name: 'Plateforme' })).toBeVisible();
  await page.getByLabel('Nom', { exact: true }).fill(organizationName);
  await page.getByLabel('Identifiant (slug)').fill(slug);
  await page.getByLabel('Commission (%)').fill('3');
  await page.getByRole('button', { name: "Créer l'organisation" }).click();
  const organizationRow = page.getByRole('row', { name: new RegExp(organizationName) });
  await expect(organizationRow).toContainText('Active');
  await expect(organizationRow).toContainText('3 %');

  // 2. They invite its administrator; Keycloak's email reaches Mailpit.
  await page.getByLabel('Organisation').selectOption({ label: organizationName });
  await page.getByLabel('Email').fill(adminEmail);
  await page.getByLabel('Rôle').selectOption('admin');
  await page.getByRole('button', { name: "Envoyer l'invitation" }).click();
  await expect(page.getByRole('status')).toHaveText(`Invitation envoyée à ${adminEmail}.`);

  // 3. The invited administrator follows the link and sets a password.
  const invitation = await latestMessageTo(request, adminEmail);
  await page.goto(linkContaining(invitation, 'action-token'));
  await page.getByRole('link', { name: /Click here to proceed/ }).click();
  await page.locator('#password-new').fill(DEMO_PASSWORD);
  await page.locator('#password-confirm').fill(DEMO_PASSWORD);
  await page.locator('input[type="submit"], button[type="submit"]').first().click();
  await page.getByRole('link', { name: /application/i }).click();
  // /espace asks for the sign-in: the first connection of the new administrator.
  await signIn(page, adminEmail);
  await page.getByRole('link', { name: 'Nouvel événement' }).click();
  await page.getByLabel('Titre').fill(eventTitle);
  await page.getByLabel('Description').fill('Concert de jazz');
  await page.getByLabel('Lieu').fill('Salle Pleyel');
  await page.getByLabel('Début (heure de Paris)').fill('2030-05-17T20:30');
  await page.getByLabel('Capacité').fill('50');
  await page.getByLabel('Libellé du tarif 1').fill('Plein');
  await page.getByLabel('Prix du tarif 1 (€)').fill('20');
  await page.getByRole('button', { name: 'Ajouter un tarif' }).click();
  await page.getByLabel('Libellé du tarif 2').fill('Réduit');
  await page.getByLabel('Prix du tarif 2 (€)').fill('12,50');
  await page.getByRole('button', { name: 'Créer', exact: true }).click();

  // 5. They revise the draft, then publish it.
  await expect(page.getByRole('heading', { level: 1, name: eventTitle })).toBeVisible();
  await page.getByLabel('Lieu').fill('Philharmonie');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByLabel('Lieu')).toHaveValue('Philharmonie');
  await page.getByRole('button', { name: 'Publier' }).click();
  await expect(page.getByRole('button', { name: 'Dépublier' })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText(/dépubliez-le avant de le modifier/);

  // 6. The published event is in the public catalogue; a buyer pays two tickets.
  await page.goto('/');
  await page.getByRole('link', { name: eventTitle }).click();
  await expect(page.getByRole('heading', { level: 1, name: eventTitle })).toBeVisible();
  await page.getByRole('button', { name: 'Ajouter un billet Plein' }).click();
  await page.getByRole('button', { name: 'Ajouter un billet Réduit' }).click();
  await page.getByLabel('Email', { exact: true }).fill(buyerEmail);
  await page.getByRole('button', { name: 'Réserver et payer' }).click();
  await page.getByLabel('Numéro de carte').fill('4242424242424242');
  await page.getByRole('button', { name: 'Payer', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Paiement accepté' })).toBeVisible();
  await expect(page.getByText('2 billets')).toBeVisible();

  // 7. The sales page shows the figures: 2 tickets, 32,50 € total, 3 % commission (0,98 € after rounding half up), net.
  await page.goto('/espace');
  await page
    .getByRole('row', { name: new RegExp(eventTitle) })
    .getByRole('link', { name: 'Ventes' })
    .click();
  await expect(page.getByText('Billets vendus : 2')).toBeVisible();
  await expect(page.getByText('Places restantes : 48')).toBeVisible();
  await expect(page.getByText(/^Total des ventes : 32,50\s€$/)).toBeVisible();
  await expect(page.getByText(/^Commission de la plateforme : 0,98\s€$/)).toBeVisible();
  await expect(page.getByText(/^Net dû à l'organisation : 31,52\s€$/)).toBeVisible();

  // 8. Seats are taken: the event is locked, no revision and no unpublishing.
  await page.getByRole('link', { name: "Retour à l'événement" }).click();
  await expect(page.getByRole('status')).toHaveText(/Des places ont été prises/);
  await expect(page.getByLabel('Lieu')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Enregistrer' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Dépublier' })).toHaveCount(0);
});
