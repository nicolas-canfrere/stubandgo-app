import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { API_URL } from '../api/client';
import { intimateEvent, problemBody, rockEvent } from '../test/fixtures';
import { renderWithProviders } from '../test/render';
import { server } from '../test/server';
import { NotFoundPage } from './NotFoundPage';
import { OrganizationPage } from './OrganizationPage';

function renderAt(route: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/o/:slug" element={<OrganizationPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>,
    { route },
  );
}

describe('OrganizationPage', () => {
  it('shows the organization name and its events', async () => {
    server.use(
      http.get(`${API_URL}/api/organizations/demo-rock-asso`, () =>
        HttpResponse.json({
          slug: 'demo-rock-asso',
          name: 'Rock Asso',
          events: [rockEvent, intimateEvent],
        }),
      ),
    );

    renderAt('/o/demo-rock-asso');

    expect(await screen.findByRole('heading', { name: 'Rock Asso' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Soirée Rock' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Concert Intimiste' })).toBeInTheDocument();
    expect(screen.getByText('Le Petit Bain')).toBeInTheDocument();
  });

  it('renders the not found page on an unknown organization', async () => {
    server.use(
      http.get(`${API_URL}/api/organizations/inconnu`, () =>
        HttpResponse.json(problemBody('organization_not_found', 404, 'Not found.'), {
          status: 404,
          headers: { 'Content-Type': 'application/problem+json' },
        }),
      ),
    );

    renderAt('/o/inconnu');

    expect(await screen.findByRole('heading', { name: 'Page introuvable' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: "Retour à l'accueil" })).toHaveAttribute('href', '/');
  });

  it('renders the not found page on a malformed slug rejected with invalid_value', async () => {
    server.use(
      http.get(`${API_URL}/api/organizations/AB`, () =>
        HttpResponse.json(problemBody('invalid_value', 422, 'Invalid.'), {
          status: 422,
          headers: { 'Content-Type': 'application/problem+json' },
        }),
      ),
    );

    renderAt('/o/AB');

    expect(await screen.findByRole('heading', { name: 'Page introuvable' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: "Retour à l'accueil" })).toHaveAttribute('href', '/');
  });

  it('shows a dedicated message when the API is unreachable', async () => {
    server.use(http.get(`${API_URL}/api/organizations/demo-rock-asso`, () => HttpResponse.error()));

    renderAt('/o/demo-rock-asso');

    expect(await screen.findByRole('heading', { name: 'API injoignable' })).toBeInTheDocument();
  });
});
