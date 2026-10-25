import { Route, Routes } from 'react-router-dom';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/render';
import { StaffAuthCallbackPage } from './StaffAuthCallbackPage';

describe('StaffAuthCallbackPage', () => {
  it('goes back to the platform space by default once signed in', () => {
    renderWithProviders(
      <Routes>
        <Route path="/plateforme/auth/callback" element={<StaffAuthCallbackPage />} />
        <Route path="/plateforme" element={<p>plateforme</p>} />
      </Routes>,
      { route: '/plateforme/auth/callback', user: { name: 'Alex' } },
    );

    expect(screen.getByText('plateforme')).toBeInTheDocument();
  });
});
