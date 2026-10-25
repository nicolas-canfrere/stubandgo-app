import { screen } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { renderWithProviders } from '../test/render';
import { AuthCallbackPage } from './AuthCallbackPage';

function Where() {
  const { pathname, search } = useLocation();

  return <p>{`at ${pathname}${search}`}</p>;
}

function renderCallback(options: Parameters<typeof renderWithProviders>[1]) {
  return renderWithProviders(
    <Routes>
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="*" element={<Where />} />
    </Routes>,
    { route: '/auth/callback', ...options },
  );
}

describe('AuthCallbackPage', () => {
  it('returns to the page requested before the sign-in', () => {
    renderCallback({ user: { name: 'Camille', state: '/scan?x=1' } });

    expect(screen.getByText('at /scan?x=1')).toBeInTheDocument();
  });

  it.each([undefined, 42, 'scan', '//evil.com', '/\\evil.com', 'https://evil.com'])(
    'falls back to the home page for the state %j',
    (state) => {
      renderCallback({ user: { name: 'Camille', state } });

      expect(screen.getByText('at /')).toBeInTheDocument();
    },
  );

  it('shows an error with a retry button when the sign-in failed', () => {
    renderCallback({ authError: new Error('boom') });

    expect(screen.getByRole('alert')).toHaveTextContent('La connexion a échoué.');
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument();
  });
});
