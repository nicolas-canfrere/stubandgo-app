import { type APIRequestContext, expect, type Page, test } from '@playwright/test';
import { API_URL, DEMO_EVENT, MAILPIT_URL } from './stack.ts';

type MailpitPart = { PartID: string; FileName: string; ContentType: string };
type MailpitMessage = { ID: string; Inline: MailpitPart[]; Attachments: MailpitPart[] };

// The ticket email leaves asynchronously (outbox, relay, RabbitMQ, worker): a few seconds.
const EMAIL_TIMEOUT_MS = 60_000;

async function remainingSeats(request: APIRequestContext, eventId: string): Promise<number> {
  const response = await request.get(`${API_URL}/api/events/${eventId}/availability`);
  expect(response.ok()).toBe(true);

  return ((await response.json()) as { remaining: number }).remaining;
}

async function ticketEmailFor(request: APIRequestContext, email: string): Promise<MailpitMessage> {
  let id: string | undefined;
  await expect
    .poll(
      async () => {
        const search = await request.get(`${MAILPIT_URL}/api/v1/search`, {
          params: { query: `to:"${email}"` },
        });
        id = ((await search.json()) as { messages: { ID: string }[] }).messages[0]?.ID;

        return id;
      },
      { message: `ticket email for ${email} in Mailpit`, timeout: EMAIL_TIMEOUT_MS },
    )
    .toBeDefined();

  const message = await request.get(`${MAILPIT_URL}/api/v1/message/${id}`);

  return (await message.json()) as MailpitMessage;
}

async function dropTicketImage(page: Page, name: string, png: Buffer) {
  await page
    .getByLabel('Choisir une image')
    .setInputFiles({ name, mimeType: 'image/png', buffer: png });
}

test('testFullL1Flow: buy two tickets, decline then pay, read the QR code from the email, scan twice', async ({
  page,
  request,
}) => {
  const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;

  // 1. Browse the upcoming events.
  await page.goto('/');
  await page.getByRole('link', { name: DEMO_EVENT }).click();
  await expect(page.getByRole('heading', { level: 1, name: DEMO_EVENT })).toBeVisible();
  const eventId = page.url().split('/events/')[1] ?? '';
  const seatsBefore = await remainingSeats(request, eventId);
  await expect(page.getByText(`${seatsBefore} places restantes`)).toBeVisible();

  // 2. Order one Plein and one Réduit ticket.
  await page.getByRole('button', { name: 'Ajouter un billet Plein' }).click();
  await page.getByRole('button', { name: 'Ajouter un billet Réduit' }).click();
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Réserver et payer' }).click();
  await expect(page.getByRole('heading', { name: 'Paiement', exact: true })).toBeVisible();
  expect(await remainingSeats(request, eventId)).toBe(seatsBefore - 2);

  // 3. The declined card frees the seats; « Recommencer » brings the same choices back.
  await page.getByLabel('Numéro de carte').fill('4000 0000 0000 0002');
  await page.getByRole('button', { name: 'Payer', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Paiement refusé, vos places ont été libérées.');
  expect(await remainingSeats(request, eventId)).toBe(seatsBefore);

  await page.getByRole('button', { name: 'Recommencer' }).click();
  await expect(page.getByRole('heading', { level: 1, name: DEMO_EVENT })).toBeVisible();
  await expect(page.getByText(`${seatsBefore} places restantes`)).toBeVisible();
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue(email);
  await expect(page.getByLabel('Quantité Plein')).toHaveText('1');
  await expect(page.getByLabel('Quantité Réduit')).toHaveText('1');

  await page.getByRole('button', { name: 'Réserver et payer' }).click();
  await page.getByLabel('Numéro de carte').fill('4242424242424242');
  await page.getByRole('button', { name: 'Payer', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Paiement accepté' })).toBeVisible();
  await expect(page.getByText('2 billets')).toBeVisible();

  // 4. The email holds one QR code per ticket, as inline images (no attachment).
  const message = await ticketEmailFor(request, email);
  expect(message.Inline.map((part) => part.FileName).sort()).toEqual([
    'ticket-1.png',
    'ticket-2.png',
  ]);
  expect(message.Attachments).toEqual([]);
  const ticket = message.Inline.find((part) => part.FileName === 'ticket-1.png');
  const image = await request.get(
    `${MAILPIT_URL}/api/v1/message/${message.ID}/part/${ticket?.PartID}`,
  );
  expect(image.headers()['content-type']).toContain('image/png');
  const png = await image.body();

  // 5. The scan page reads the QR code from the image: valid first, already used next.
  await page.getByRole('link', { name: "Contrôle d'accès" }).click();
  const eventOption = page.getByRole('option', { name: new RegExp(`^${DEMO_EVENT} — `) });
  await page
    .getByLabel('Événement contrôlé')
    .selectOption((await eventOption.getAttribute('value')) ?? '');

  await dropTicketImage(page, 'ticket-1.png', png);
  await expect(page.getByRole('status')).toHaveText('VALIDE — entrée autorisée');

  await dropTicketImage(page, 'ticket-1.png', png);
  await expect(page.getByRole('status')).toHaveText(/^DÉJÀ UTILISÉ — le /);
});
