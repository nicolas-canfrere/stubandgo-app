import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { API_URL } from '../../api/client';
import { App } from '../../App';
import { draftEvent, organizationAdmin, problemBody } from '../../test/fixtures';
import { renderWithProviders } from '../../test/render';
import { server } from '../../test/server';

const salesUrl = `${API_URL}/api/backoffice/events/${draftEvent.id}/sales`;

describe('EventSalesPage', () => {
  it('shows the sales in euros with the commission and the net', async () => {
    server.use(
      http.get(salesUrl, () =>
        HttpResponse.json({
          eventId: draftEvent.id,
          seatsRemaining: 93,
          ticketsSold: 4,
          totalCents: 9000,
          commissionCents: 1150,
          netCents: 7850,
          priceTiers: [
            { priceTierId: 'a', label: 'Plein', ticketsSold: 3, totalCents: 7500 },
            { priceTierId: 'b', label: 'Réduit', ticketsSold: 1, totalCents: 1500 },
            { priceTierId: 'c', label: 'Gratuit', ticketsSold: 0, totalCents: 0 },
          ],
        }),
      ),
    );

    renderWithProviders(<App />, {
      route: `/espace/events/${draftEvent.id}/sales`,
      user: organizationAdmin,
    });

    const plein = await screen.findByRole('row', { name: /Plein/ });
    expect(within(plein).getByText('3')).toBeInTheDocument();
    expect(within(plein).getByText(/75,00\s€/)).toBeInTheDocument();
    expect(
      within(screen.getByRole('row', { name: /Gratuit/ })).getByText(/0,00\s€/),
    ).toBeInTheDocument();
    expect(screen.getByText('Billets vendus : 4')).toBeInTheDocument();
    expect(screen.getByText('Places restantes : 93')).toBeInTheDocument();
    expect(screen.getByText(/Total des ventes : 90,00\s€/)).toBeInTheDocument();
    expect(screen.getByText(/Commission de la plateforme : 11,50\s€/)).toBeInTheDocument();
    expect(screen.getByText(/Net dû à l'organisation : 78,50\s€/)).toBeInTheDocument();
  });

  it('shows the refusal for an event of another organization', async () => {
    server.use(
      http.get(salesUrl, () =>
        HttpResponse.json(problemBody('forbidden', 403, 'no'), { status: 403 }),
      ),
    );

    renderWithProviders(<App />, {
      route: `/espace/events/${draftEvent.id}/sales`,
      user: organizationAdmin,
    });

    expect(
      await screen.findByText("Votre compte n'a pas accès à cet événement."),
    ).toBeInTheDocument();
  });
});
