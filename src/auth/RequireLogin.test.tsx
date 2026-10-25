import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test/render';
import { RequireLogin } from './RequireLogin';

describe('RequireLogin', () => {
  it('starts the Keycloak sign-in with the requested path when signed out', async () => {
    const { auth } = renderWithProviders(<RequireLogin>secret</RequireLogin>, {
      route: '/scan?x=1',
    });

    await waitFor(() => expect(auth.signinRedirect).toHaveBeenCalledWith({ state: '/scan?x=1' }));
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
  });

  it('renders its children when signed in', () => {
    const { auth } = renderWithProviders(<RequireLogin>secret</RequireLogin>, {
      user: { name: 'Camille' },
    });

    expect(screen.getByText('secret')).toBeInTheDocument();
    expect(auth.signinRedirect).not.toHaveBeenCalled();
  });
});
