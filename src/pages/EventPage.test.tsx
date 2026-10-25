import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { API_URL } from '../api/client';
import {
  pleinTierId,
  problemBody,
  reduitTierId,
  rockEvent,
  rockEventDetail,
} from '../test/fixtures';
import { renderWithProviders } from '../test/render';
import { server } from '../test/server';
import { readOrderDraft } from '../orders/orderDraft';
import { NotFoundPage } from './NotFoundPage';
import { EventPage } from './EventPage';

const eventUrl = `${API_URL}/api/events/${rockEvent.id}`;

function problem(code: string, status: number, detail = 'x', extra: object = {}) {
  return HttpResponse.json(
    { ...problemBody(code, status, detail), ...extra },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );
}

function serveEvent(remaining: number | (() => number) = 198) {
  server.use(
    http.get(eventUrl, () => HttpResponse.json(rockEventDetail)),
    http.get(`${eventUrl}/availability`, () =>
      HttpResponse.json({
        eventId: rockEvent.id,
        remaining: typeof remaining === 'function' ? remaining() : remaining,
      }),
    ),
  );
}

let navigationState: unknown;

function Location({ label }: { label: string }) {
  const { state } = useLocation();
  useEffect(() => {
    navigationState = state;
  }, [state]);

  return <p>{label}</p>;
}

function renderAt(route: string | { pathname: string; state?: unknown }) {
  return renderWithProviders(
    <Routes>
      <Route path="/events/:eventId" element={<EventPage />} />
      <Route path="/orders/:id/payment" element={<Location label="page paiement" />} />
      <Route path="/orders/:id" element={<Location label="page commande" />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>,
    { route },
  );
}

async function addTicket(label: string, times = 1) {
  const user = userEvent.setup();
  for (let i = 0; i < times; i++) {
    await user.click(screen.getByRole('button', { name: `Ajouter un billet ${label}` }));
  }

  return user;
}

describe('EventPage', () => {
  it('shows the event detail with its remaining seats', async () => {
    serveEvent();

    renderAt(`/events/${rockEvent.id}`);

    expect(await screen.findByRole('heading', { name: 'Soirée Rock' })).toBeInTheDocument();
    expect(screen.getByText('La Cigale')).toBeInTheDocument();
    expect(await screen.findByText('198 places restantes')).toBeInTheDocument();
    expect(screen.getByText('Plein')).toBeInTheDocument();
    expect(screen.getByText('25,00 €')).toBeInTheDocument();
    expect(screen.getByText('15,00 €')).toBeInTheDocument();
  });

  it('posts the order without zero lines then goes to the payment page', async () => {
    serveEvent();
    let body: unknown;
    server.use(
      http.post(`${API_URL}/api/orders`, async ({ request }) => {
        body = await request.json();

        return HttpResponse.json({ id: 'ORDER1', status: 'pending' }, { status: 201 });
      }),
    );
    renderAt(`/events/${rockEvent.id}`);
    await screen.findByRole('heading', { name: 'Soirée Rock' });

    const user = await addTicket('Plein', 2);
    await user.type(screen.getByLabelText('Email'), 'buyer@example.com');
    await user.click(screen.getByRole('button', { name: 'Réserver et payer' }));

    expect(await screen.findByText('page paiement')).toBeInTheDocument();
    expect(body).toEqual({
      eventId: rockEvent.id,
      buyerEmail: 'buyer@example.com',
      lines: [{ priceTierId: pleinTierId, quantity: 2 }],
    });
    expect(readOrderDraft(navigationState)).toEqual({
      buyerEmail: 'buyer@example.com',
      quantities: { [pleinTierId]: 2 },
    });
  });

  it('goes to the order page when the order is already paid', async () => {
    serveEvent();
    server.use(
      http.post(`${API_URL}/api/orders`, () =>
        HttpResponse.json({ id: 'ORDER2', status: 'paid' }, { status: 201 }),
      ),
    );
    renderAt(`/events/${rockEvent.id}`);
    await screen.findByRole('heading', { name: 'Soirée Rock' });

    const user = await addTicket('Plein');
    await user.type(screen.getByLabelText('Email'), 'buyer@example.com');
    await user.click(screen.getByRole('button', { name: 'Réserver et payer' }));

    expect(await screen.findByText('page commande')).toBeInTheDocument();
  });

  it('sends a single request on a double click', async () => {
    serveEvent();
    let calls = 0;
    server.use(
      http.post(`${API_URL}/api/orders`, async () => {
        calls++;
        await new Promise((resolve) => setTimeout(resolve, 50));

        return HttpResponse.json({ id: 'ORDER1', status: 'pending' }, { status: 201 });
      }),
    );
    renderAt(`/events/${rockEvent.id}`);
    await screen.findByRole('heading', { name: 'Soirée Rock' });

    const user = await addTicket('Plein');
    await user.type(screen.getByLabelText('Email'), 'buyer@example.com');
    await user.dblClick(screen.getByRole('button', { name: 'Réserver et payer' }));

    expect(await screen.findByText('page paiement')).toBeInTheDocument();
    expect(calls).toBe(1);
  });

  it('shows a validation violation under the email field', async () => {
    serveEvent();
    server.use(
      http.post(`${API_URL}/api/orders`, () =>
        problem('validation_failed', 422, 'Invalid.', {
          violations: [
            { propertyPath: 'buyerEmail', message: 'This value is not a valid email address.' },
          ],
        }),
      ),
    );
    renderAt(`/events/${rockEvent.id}`);
    await screen.findByRole('heading', { name: 'Soirée Rock' });

    const user = await addTicket('Plein');
    await user.type(screen.getByLabelText('Email'), 'nope');
    await user.click(screen.getByRole('button', { name: 'Réserver et payer' }));

    expect(await screen.findByText('Saisissez une adresse email valide.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription(
      /Saisissez une adresse email valide\./,
    );
    expect(screen.queryByText('This value is not a valid email address.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Réserver et payer' })).toBeEnabled();
  });

  it('shows sold_out at the top of the form and reloads the remaining seats', async () => {
    let remaining = 198;
    serveEvent(() => remaining);
    server.use(
      http.post(`${API_URL}/api/orders`, () => {
        remaining = 3;

        return problem('sold_out', 409);
      }),
    );
    renderAt(`/events/${rockEvent.id}`);
    expect(await screen.findByText('198 places restantes')).toBeInTheDocument();

    const user = await addTicket('Plein', 5);
    await user.type(screen.getByLabelText('Email'), 'buyer@example.com');
    await user.click(screen.getByRole('button', { name: 'Réserver et payer' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Plus assez de places pour cette commande.',
    );
    expect(await screen.findByText('3 places restantes')).toBeInTheDocument();
  });

  it('prefills the form from an order draft in the navigation state', async () => {
    serveEvent();

    renderAt({
      pathname: `/events/${rockEvent.id}`,
      state: { buyerEmail: 'back@example.com', quantities: { [reduitTierId]: 3 } },
    });

    expect(await screen.findByLabelText('Email')).toHaveValue('back@example.com');
    expect(screen.getByRole('status', { name: 'Quantité Réduit' })).toHaveTextContent('3');
  });

  it.each([
    ['a malformed identifier', 'xyz', 422, 'invalid_value'],
    ['an unknown event', '01JAE5Z8Q3M4N6P7R8S9T0V9ZZ', 404, 'event_not_found'],
  ])('renders the not found page on %s', async (_label, id, status, code) => {
    server.use(http.get(`${API_URL}/api/events/${id}`, () => problem(code, status)));

    renderAt(`/events/${id}`);

    expect(await screen.findByRole('heading', { name: 'Page introuvable' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: "Retour à l'accueil" })).toHaveAttribute('href', '/');
  });

  it('shows a dedicated message when the API is unreachable', async () => {
    server.use(http.get(eventUrl, () => HttpResponse.error()));

    renderAt(`/events/${rockEvent.id}`);

    expect(await screen.findByRole('heading', { name: 'API injoignable' })).toBeInTheDocument();
  });
});
