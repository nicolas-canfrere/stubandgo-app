import { screen, within } from '@testing-library/react';
import { App } from './App';
import { renderWithProviders } from './test/render';

describe('App', () => {
  it('shows the navigation bar with the events and access control links', () => {
    renderWithProviders(<App />);

    const nav = screen.getByRole('navigation');
    expect(within(nav).getByRole('link', { name: 'Événements' })).toHaveAttribute('href', '/');
    expect(within(nav).getByRole('link', { name: "Contrôle d'accès" })).toHaveAttribute(
      'href',
      '/scan',
    );
  });

  it('renders the not found page on an unknown route', () => {
    renderWithProviders(<App />, { route: '/nimporte-quoi' });

    expect(screen.getByRole('heading', { name: 'Page introuvable' })).toBeInTheDocument();
  });
});
