import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { API_URL } from '../api/client';
import { intimateEvent, rockEvent, theatreEvent } from '../test/fixtures';
import { renderWithProviders } from '../test/render';
import { server } from '../test/server';
import { HomePage } from './HomePage';
import { NotFoundPage } from './NotFoundPage';
import { OrganizationPage } from './OrganizationPage';

describe('HomePage', () => {
  it('lists the upcoming events with date, venue and organization, without remaining places', async () => {
    server.use(
      http.get(`${API_URL}/api/events`, () =>
        HttpResponse.json([rockEvent, intimateEvent, theatreEvent]),
      ),
    );

    renderWithProviders(<HomePage />);

    const rock = await screen.findByRole('link', { name: 'Soirée Rock' });
    expect(rock).toHaveAttribute('href', `/events/${rockEvent.id}`);
    expect(screen.getByRole('link', { name: 'Concert Intimiste' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Le Malade imaginaire' })).toBeInTheDocument();
    expect(screen.getByText('mer. 25 nov. 2026 · 20:00')).toBeInTheDocument();
    expect(screen.getByText('La Cigale')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'demo-rock-asso' })).toHaveLength(2);
    expect(screen.queryByText(/places? restantes?/i)).not.toBeInTheDocument();
  });

  it('opens the organization page from an event card', async () => {
    server.use(
      http.get(`${API_URL}/api/events`, () => HttpResponse.json([rockEvent])),
      http.get(`${API_URL}/api/organizations/demo-rock-asso`, () =>
        HttpResponse.json({ slug: 'demo-rock-asso', name: 'Rock Asso', events: [rockEvent] }),
      ),
    );

    renderWithProviders(
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/o/:slug" element={<OrganizationPage />} />
      </Routes>,
    );

    await userEvent.click(await screen.findByRole('link', { name: 'demo-rock-asso' }));

    expect(await screen.findByRole('heading', { name: 'Rock Asso' })).toBeInTheDocument();
  });

  it('shows a dedicated message when the API is unreachable', async () => {
    server.use(http.get(`${API_URL}/api/events`, () => HttpResponse.error()));

    renderWithProviders(<HomePage />);

    expect(await screen.findByRole('heading', { name: 'API injoignable' })).toBeInTheDocument();
    expect(screen.getByText(/L'API ne répond pas sur/)).toBeInTheDocument();
  });

  it('shows an empty state when there is no upcoming event', async () => {
    server.use(http.get(`${API_URL}/api/events`, () => HttpResponse.json([])));

    renderWithProviders(<HomePage />);

    expect(await screen.findByText('Aucun événement à venir.')).toBeInTheDocument();
  });

  it('renders the not found page on an unknown route', () => {
    renderWithProviders(
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>,
      { route: '/nimporte-quoi' },
    );

    expect(screen.getByRole('heading', { name: 'Page introuvable' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: "Retour à l'accueil" })).toHaveAttribute('href', '/');
  });
});
