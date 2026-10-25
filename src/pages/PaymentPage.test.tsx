import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, vi } from 'vitest';
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
import { ConfirmationPage } from './ConfirmationPage';
import { NotFoundPage } from './NotFoundPage';
import { PaymentPage } from './PaymentPage';

const orderId = '01JAE5Z8Q3M4N6P7R8S9T0V3B1';
const orderUrl = `${API_URL}/api/orders/${orderId}`;
const draft = {
  buyerEmail: 'ana@example.com',
  quantities: { [pleinTierId]: 1, [reduitTierId]: 2 },
};

const orderBody = (status: string, expiresAt: string | null = '2099-01-01T00:00:00Z') => ({
  id: orderId,
  status,
  eventId: rockEvent.id,
  lines: [
    { priceTierId: pleinTierId, quantity: 1, unitPriceCents: 2500 },
    { priceTierId: reduitTierId, quantity: 2, unitPriceCents: 1500 },
  ],
  totalCents: 5500,
  expiresAt,
});

function serveOrder(status = 'pending', expiresAt?: string | null) {
  server.use(http.get(orderUrl, () => HttpResponse.json(orderBody(status, expiresAt))));
}

function serveEvent() {
  server.use(
    http.get(`${API_URL}/api/events/${rockEvent.id}`, () => HttpResponse.json(rockEventDetail)),
  );
}

function problem(code: string, status: number, extra: object = {}) {
  return HttpResponse.json(
    { ...problemBody(code, status, 'x'), ...extra },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );
}

let navigationState: unknown;

function EventStub() {
  const { state } = useLocation();
  useEffect(() => {
    navigationState = state;
  }, [state]);

  return <p>page événement</p>;
}

function renderAt(route: string | { pathname: string; state?: unknown }) {
  return renderWithProviders(
    <Routes>
      <Route path="/orders/:orderId/payment" element={<PaymentPage />} />
      <Route path="/orders/:orderId" element={<ConfirmationPage />} />
      <Route path="/events/:eventId" element={<EventStub />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>,
    { route },
  );
}

const paymentRoute = { pathname: `/orders/${orderId}/payment`, state: draft };

afterEach(() => vi.useRealTimers());

describe('PaymentPage', () => {
  it('summarises the order with tier labels and lists the test cards', async () => {
    serveOrder();
    serveEvent();

    renderAt(paymentRoute);

    expect(await screen.findByText('Plein × 1 — 25,00 €')).toBeInTheDocument();
    expect(screen.getByText('Réduit × 2 — 30,00 €')).toBeInTheDocument();
    expect(screen.getByText('Total : 55,00 €')).toBeInTheDocument();
    expect(screen.getByText(/4242 4242 4242 4242/)).toBeInTheDocument();
    expect(screen.getByText(/4000 0000 0000 0002/)).toBeInTheDocument();
  });

  it('shows the lines without labels when the event call fails', async () => {
    serveOrder();
    server.use(
      http.get(`${API_URL}/api/events/${rockEvent.id}`, () => problem('internal_error', 500)),
    );

    renderAt(paymentRoute);

    expect(await screen.findByText('× 1 — 25,00 €')).toBeInTheDocument();
    expect(screen.getByText('× 2 — 30,00 €')).toBeInTheDocument();
  });

  it('sends the card number without spaces then goes to the confirmation', async () => {
    serveOrder();
    serveEvent();
    let body: unknown;
    server.use(
      http.post(`${orderUrl}/payment`, async ({ request }) => {
        body = await request.json();
        serveOrder('paid', null);

        return HttpResponse.json({ status: 'paid' });
      }),
    );

    renderAt(paymentRoute);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Numéro de carte'), '4242 4242 4242 4242');
    await user.click(screen.getByRole('button', { name: 'Payer' }));

    expect(await screen.findByRole('heading', { name: 'Paiement accepté' })).toBeInTheDocument();
    expect(body).toEqual({ cardNumber: '4242424242424242' });
  });

  it('sends one payment on a double click', async () => {
    serveOrder();
    serveEvent();
    let calls = 0;
    server.use(
      http.post(`${orderUrl}/payment`, async () => {
        calls++;
        await new Promise((resolve) => setTimeout(resolve, 50));
        serveOrder('paid', null);

        return HttpResponse.json({ status: 'paid' });
      }),
    );

    renderAt(paymentRoute);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Numéro de carte'), '4242424242424242');
    await user.dblClick(screen.getByRole('button', { name: 'Payer' }));

    await screen.findByRole('heading', { name: 'Paiement accepté' });
    expect(calls).toBe(1);
  });

  it('explains a declined payment and restarts on the event with the draft', async () => {
    serveOrder();
    serveEvent();
    server.use(
      http.post(`${orderUrl}/payment`, () =>
        problem('payment_declined', 402, { orderStatus: 'failed' }),
      ),
    );

    renderAt(paymentRoute);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Numéro de carte'), '4000000000000002');
    await user.click(screen.getByRole('button', { name: 'Payer' }));

    expect(
      await screen.findByText('Paiement refusé, vos places ont été libérées.'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Recommencer' }));

    expect(await screen.findByText('page événement')).toBeInTheDocument();
    expect(navigationState).toEqual(draft);
  });

  it('explains an expired order and offers to restart', async () => {
    serveOrder();
    serveEvent();
    server.use(
      http.post(`${orderUrl}/payment`, () =>
        problem('order_expired', 409, { orderStatus: 'expired' }),
      ),
    );

    renderAt(paymentRoute);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Numéro de carte'), '4242424242424242');
    await user.click(screen.getByRole('button', { name: 'Payer' }));

    expect(
      await screen.findByText('Réservation expirée, vos places ont été libérées.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recommencer' })).toBeInTheDocument();
  });

  it('rebuilds the draft from the order lines when the state is lost', async () => {
    serveOrder('failed', null);

    renderAt(`/orders/${orderId}/payment`);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Recommencer' }));

    expect(await screen.findByText('page événement')).toBeInTheDocument();
    expect(navigationState).toEqual({
      buyerEmail: '',
      quantities: { [pleinTierId]: 1, [reduitTierId]: 2 },
    });
  });

  it('disables Payer and offers Recommencer when the reservation runs out', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    serveOrder('pending', new Date(Date.now() + 120_000).toISOString());
    serveEvent();

    renderAt(paymentRoute);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Numéro de carte'), '4242424242424242');
    expect(screen.getByRole('button', { name: 'Payer' })).toBeEnabled();

    act(() => vi.advanceTimersByTime(121_000));

    expect(screen.getByText('Réservation expirée')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Payer' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Recommencer' })).toBeInTheDocument();
  });

  it('redirects a paid order to the confirmation', async () => {
    serveOrder('paid', null);

    renderAt(paymentRoute);

    expect(await screen.findByRole('heading', { name: 'Paiement accepté' })).toBeInTheDocument();
  });

  it('shows page not found for an unknown or malformed order', async () => {
    server.use(http.get(orderUrl, () => problem('order_not_found', 404)));
    renderAt(paymentRoute);
    expect(await screen.findByRole('heading', { name: 'Page introuvable' })).toBeInTheDocument();
  });

  it('shows page not found for a malformed order id', async () => {
    server.use(http.get(`${API_URL}/api/orders/xyz`, () => problem('invalid_value', 422)));
    renderAt('/orders/xyz/payment');
    expect(await screen.findByRole('heading', { name: 'Page introuvable' })).toBeInTheDocument();
  });

  it('shows the unreachable API message', async () => {
    server.use(http.get(orderUrl, () => HttpResponse.error()));
    renderAt(paymentRoute);
    expect(await screen.findByText('API injoignable')).toBeInTheDocument();
  });
});
