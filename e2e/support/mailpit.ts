import { type APIRequestContext, expect } from '@playwright/test';
import { MAILPIT_URL } from '../stack.ts';

export type MailpitPart = { PartID: string; FileName: string; ContentType: string };
export type MailpitMessage = {
  ID: string;
  Text: string;
  Inline: MailpitPart[];
  Attachments: MailpitPart[];
};

// Emails leave asynchronously (outbox, relay, RabbitMQ, worker) or through Keycloak: a few seconds.
const EMAIL_TIMEOUT_MS = 60_000;

/** The latest message sent to `recipient`, read through Mailpit's HTTP API (polled until it arrives). */
export async function latestMessageTo(
  request: APIRequestContext,
  recipient: string,
): Promise<MailpitMessage> {
  let id: string | undefined;
  await expect
    .poll(
      async () => {
        const search = await request.get(`${MAILPIT_URL}/api/v1/search`, {
          params: { query: `to:"${recipient}"` },
        });
        id = ((await search.json()) as { messages: { ID: string }[] }).messages[0]?.ID;

        return id;
      },
      { message: `email for ${recipient} in Mailpit`, timeout: EMAIL_TIMEOUT_MS },
    )
    .toBeDefined();

  const message = await request.get(`${MAILPIT_URL}/api/v1/message/${id}`);

  return (await message.json()) as MailpitMessage;
}

/** The first link of the message body that contains `fragment` (plain-text part, so no HTML escaping). */
export function linkContaining(message: MailpitMessage, fragment: string): string {
  const link = message.Text.match(new RegExp(`https?://[^\\s<>"]*${fragment}[^\\s<>"]*`))?.[0];
  expect(link, `a link containing « ${fragment} » in the email`).toBeDefined();

  return link ?? '';
}
