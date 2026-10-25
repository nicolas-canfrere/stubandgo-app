import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { API_URL } from '../../api/client';
import type { components } from '../../api/schema';
import { App } from '../../App';
import { draftEvent, organizationAdmin, problemBody } from '../../test/fixtures';
import { renderWithProviders } from '../../test/render';
import { server } from '../../test/server';

type BackofficeEvent = components['schemas']['BackofficeEvent'];

const eventsUrl = `${API_URL}/api/backoffice/events`;
const eventUrl = `${eventsUrl}/${draftEvent.id}`;
const publicationUrl = `${eventUrl}/publication`;

function renderEvent(route: string) {
  return renderWithProviders(<App />, { route, user: organizationAdmin });
}

/** Serves the event (mutable) and records the last body received by a PUT. */
function serveEvent(initial: BackofficeEvent) {
  const state = { event: initial, sent: undefined as unknown };
  server.use(
    http.get(eventUrl, () => HttpResponse.json(state.event)),
    http.get(eventsUrl, () => HttpResponse.json({ events: [] })),
    http.put(eventUrl, async ({ request }) => {
      state.sent = await request.json();
      return HttpResponse.json({ ...state.event, title: 'Soirée Rock 2' });
    }),
  );

  return state;
}

async function fillNewEvent() {
  await userEvent.type(screen.getByLabelText('Titre'), 'Soirée Jazz');
  await userEvent.type(screen.getByLabelText('Description'), 'Du jazz.');
  await userEvent.type(screen.getByLabelText('Lieu'), 'Le Sunset');
  fireEvent.change(screen.getByLabelText('Début (heure de Paris)'), {
    target: { value: '2026-12-01T20:00' },
  });
  await userEvent.type(screen.getByLabelText('Capacité'), '120');
  await userEvent.type(screen.getByLabelText('Libellé du tarif 1'), 'Plein');
  await userEvent.type(screen.getByLabelText('Prix du tarif 1 (€)'), '12,5');
}

describe('EventFormPage creation', () => {
  it('creates the event with the price in cents and the date with Paris offset, then shows its detail', async () => {
    let sent: unknown;
    let detailReads = 0;
    const created = { ...draftEvent, title: 'Soirée Jazz' };
    server.use(
      http.post(eventsUrl, async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json(created, { status: 201 });
      }),
      http.get(eventUrl, () => {
        detailReads += 1;
        return HttpResponse.json(created);
      }),
      http.get(eventsUrl, () => HttpResponse.json({ events: [] })),
    );
    renderEvent('/espace/events/new');

    await fillNewEvent();
    await userEvent.click(screen.getByRole('button', { name: 'Créer' }));

    expect(await screen.findByDisplayValue('Soirée Jazz')).toBeInTheDocument();
    expect(sent).toEqual({
      title: 'Soirée Jazz',
      description: 'Du jazz.',
      venue: 'Le Sunset',
      startsAt: '2026-12-01T20:00:00+01:00',
      capacity: 120,
      priceTiers: [{ label: 'Plein', priceCents: 1250 }],
    });
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeInTheDocument();
    // The detail shows the created event at once, then refreshes it: let that read finish.
    await waitFor(() => expect(detailReads).toBe(1));
  });

  it('adds and removes tiers dynamically', async () => {
    renderEvent('/espace/events/new');

    await userEvent.click(screen.getByRole('button', { name: 'Ajouter un tarif' }));
    await userEvent.type(screen.getByLabelText('Libellé du tarif 2'), 'Réduit');
    expect(screen.getByLabelText('Libellé du tarif 2')).toHaveValue('Réduit');

    await userEvent.click(screen.getByRole('button', { name: 'Retirer le tarif 1' }));

    expect(screen.queryByLabelText('Libellé du tarif 2')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Libellé du tarif 1')).toHaveValue('Réduit');
  });

  it('refuses a malformed price without calling the API', async () => {
    let called = false;
    server.use(
      http.post(eventsUrl, () => {
        called = true;
        return HttpResponse.json(draftEvent, { status: 201 });
      }),
    );
    renderEvent('/espace/events/new');
    await fillNewEvent();
    await userEvent.clear(screen.getByLabelText('Prix du tarif 1 (€)'));
    await userEvent.type(screen.getByLabelText('Prix du tarif 1 (€)'), '12,345');

    await userEvent.click(screen.getByRole('button', { name: 'Créer' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Prix invalide pour le tarif « Plein »');
    expect(called).toBe(false);
  });

  it('shows the API refusal of a start date in the past', async () => {
    server.use(
      http.post(eventsUrl, () =>
        HttpResponse.json(problemBody('event_start_in_past', 422, 'past'), { status: 422 }),
      ),
    );
    renderEvent('/espace/events/new');
    await fillNewEvent();

    await userEvent.click(screen.getByRole('button', { name: 'Créer' }));

    expect(await screen.findByText('La date de début est déjà passée.')).toBeInTheDocument();
  });
});

describe('EventFormPage revision', () => {
  it('keeps the id of an existing tier, creates the added one and drops the removed one', async () => {
    const state = serveEvent(draftEvent);
    renderEvent(`/espace/events/${draftEvent.id}`);
    expect(await screen.findByDisplayValue('Soirée Rock')).toBeInTheDocument();
    expect(screen.getByLabelText('Début (heure de Paris)')).toHaveValue('2026-11-25T20:00');

    await userEvent.clear(screen.getByLabelText('Prix du tarif 1 (€)'));
    await userEvent.type(screen.getByLabelText('Prix du tarif 1 (€)'), '30');
    await userEvent.click(screen.getByRole('button', { name: 'Retirer le tarif 3' }));
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter un tarif' }));
    await userEvent.type(screen.getByLabelText('Libellé du tarif 3'), 'VIP');
    await userEvent.type(screen.getByLabelText('Prix du tarif 3 (€)'), '40');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(state.sent).toBeDefined());
    expect(state.sent).toEqual({
      title: 'Soirée Rock',
      description: 'Une soirée rock à La Cigale.',
      venue: 'La Cigale',
      startsAt: '2026-11-25T20:00:00+01:00',
      capacity: 200,
      priceTiers: [
        { id: draftEvent.priceTiers[0]?.id, label: 'Plein', priceCents: 3000 },
        { id: draftEvent.priceTiers[1]?.id, label: 'Réduit', priceCents: 1500 },
        { label: 'VIP', priceCents: 4000 },
      ],
    });
    expect(await screen.findByDisplayValue('Soirée Rock 2')).toBeInTheDocument();
  });

  it('shows the locked message when the API answers 409 event_locked on save', async () => {
    serveEvent(draftEvent);
    server.use(
      http.put(eventUrl, () =>
        HttpResponse.json(problemBody('event_locked', 409, 'locked'), { status: 409 }),
      ),
    );
    renderEvent(`/espace/events/${draftEvent.id}`);
    await screen.findByDisplayValue('Soirée Rock');

    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(
      await screen.findByText(
        "Des places ont été prises : l'événement ne peut plus être modifié ni dépublié.",
      ),
    ).toBeInTheDocument();
  });

  it('is read-only, with the explanation, for a published event', async () => {
    serveEvent({ ...draftEvent, status: 'published' });
    renderEvent(`/espace/events/${draftEvent.id}`);

    expect(
      await screen.findByText("L'événement est publié : dépubliez-le avant de le modifier."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Titre')).toBeDisabled();
    expect(screen.getByLabelText('Prix du tarif 1 (€)')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Enregistrer' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ajouter un tarif' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dépublier' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publier' })).not.toBeInTheDocument();
  });

  it('is read-only and cannot be unpublished once locked', async () => {
    serveEvent({ ...draftEvent, status: 'published', locked: true });
    renderEvent(`/espace/events/${draftEvent.id}`);

    expect(
      await screen.findByText(
        "Des places ont été prises : l'événement ne peut plus être modifié ni dépublié.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Titre')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Dépublier' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir les ventes' })).toHaveAttribute(
      'href',
      `/espace/events/${draftEvent.id}/sales`,
    );
  });

  it('shows a not found message for an unknown event', async () => {
    server.use(
      http.get(eventUrl, () =>
        HttpResponse.json(problemBody('forbidden', 403, 'no'), { status: 403 }),
      ),
    );
    renderEvent(`/espace/events/${draftEvent.id}`);

    expect(
      await screen.findByText("Votre compte n'a pas accès à cet événement."),
    ).toBeInTheDocument();
  });
});

describe('EventFormPage publication', () => {
  it('publishes a draft and then offers to unpublish it', async () => {
    serveEvent(draftEvent);
    server.use(
      http.post(publicationUrl, () => HttpResponse.json({ ...draftEvent, status: 'published' })),
    );
    renderEvent(`/espace/events/${draftEvent.id}`);

    await userEvent.click(await screen.findByRole('button', { name: 'Publier' }));

    expect(await screen.findByRole('button', { name: 'Dépublier' })).toBeInTheDocument();
    expect(screen.getByLabelText('Titre')).toBeDisabled();
  });

  it('unpublishes a published event and makes it editable again', async () => {
    serveEvent({ ...draftEvent, status: 'published' });
    server.use(http.delete(publicationUrl, () => HttpResponse.json(draftEvent)));
    renderEvent(`/espace/events/${draftEvent.id}`);

    await userEvent.click(await screen.findByRole('button', { name: 'Dépublier' }));

    expect(await screen.findByRole('button', { name: 'Enregistrer' })).toBeInTheDocument();
    expect(screen.getByLabelText('Titre')).toBeEnabled();
  });

  it.each([
    [
      'event_locked',
      409,
      "Des places ont été prises : l'événement ne peut plus être modifié ni dépublié.",
    ],
    ['event_already_published', 409, "L'événement est déjà publié."],
    ['event_start_in_past', 422, 'La date de début est déjà passée.'],
  ])('translates the refusal %s on publication', async (code, status, message) => {
    serveEvent(draftEvent);
    server.use(
      http.post(publicationUrl, () =>
        HttpResponse.json(problemBody(code, status, 'x'), { status }),
      ),
    );
    renderEvent(`/espace/events/${draftEvent.id}`);

    await userEvent.click(await screen.findByRole('button', { name: 'Publier' }));

    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  it.each([
    [
      'event_locked',
      "Des places ont été prises : l'événement ne peut plus être modifié ni dépublié.",
    ],
    ['event_not_published', "L'événement n'est pas publié."],
  ])('translates the refusal %s on unpublication', async (code, message) => {
    serveEvent({ ...draftEvent, status: 'published' });
    server.use(
      http.delete(publicationUrl, () =>
        HttpResponse.json(problemBody(code, 409, 'x'), { status: 409 }),
      ),
    );
    renderEvent(`/espace/events/${draftEvent.id}`);

    await userEvent.click(await screen.findByRole('button', { name: 'Dépublier' }));

    expect(await screen.findByText(message)).toBeInTheDocument();
  });
});
