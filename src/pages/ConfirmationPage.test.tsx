import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { API_URL } from '../api/client';
import { pleinTierId, problemBody, reduitTierId, rockEvent } from '../test/fixtures';
import { renderWithProviders } from '../test/render';
import { server } from '../test/server';
import { ConfirmationPage } from './ConfirmationPage';
import { NotFoundPage } from './NotFoundPage';

const orderId = '01JAE5Z8Q3M4N6P7R8S9T0V3B1';
const orderUrl = `${API_URL}/api/orders/${orderId}`;

const orderBody = (status: string) => ({
  id: orderId,
  status,
  eventId: rockEvent.id,
  lines: [
    { priceTierId: pleinTierId, quantity: 1, unitPriceCents: 2500 },
    { priceTierId: reduitTierId, quantity: 2, unitPriceCents: 1500 },
  ],
  totalCents: 5500,
  expiresAt: status === 'pending' ? '2099-01-01T00:00:00Z' : null,
});

function renderConfirmation() {
  return renderWithProviders(
    <Routes>
      <Route path="/orders/:orderId" element={<ConfirmationPage />} />
      <Route path="/orders/:orderId/payment" element={<p>page paiement</p>} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>,
    { route: `/orders/${orderId}` },
  );
}

describe('ConfirmationPage', () => {
  it('confirms a paid order with the ticket count and the demo mailbox', async () => {
    server.use(http.get(orderUrl, () => HttpResponse.json(orderBody('paid'))));

    renderConfirmation();

    expect(await screen.findByRole('heading', { name: 'Paiement accepté' })).toBeInTheDocument();
    expect(screen.getByText('3 billets')).toBeInTheDocument();
    expect(screen.getByText(/par email/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /localhost:8025/ })).toHaveAttribute(
      'href',
      'http://localhost:8025',
    );
    expect(screen.getByText('démo')).toBeInTheDocument();
  });

  it('redirects a pending order to the payment', async () => {
    server.use(http.get(orderUrl, () => HttpResponse.json(orderBody('pending'))));

    renderConfirmation();

    expect(await screen.findByText('page paiement')).toBeInTheDocument();
  });

  it('offers to restart an expired order', async () => {
    server.use(http.get(orderUrl, () => HttpResponse.json(orderBody('expired'))));

    renderConfirmation();

    expect(
      await screen.findByText('Réservation expirée, vos places ont été libérées.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recommencer' })).toBeInTheDocument();
  });

  it('shows page not found for an unknown order', async () => {
    server.use(
      http.get(orderUrl, () =>
        HttpResponse.json(problemBody('order_not_found', 404, 'x'), {
          status: 404,
          headers: { 'Content-Type': 'application/problem+json' },
        }),
      ),
    );

    renderConfirmation();

    expect(await screen.findByRole('heading', { name: 'Page introuvable' })).toBeInTheDocument();
  });
});
