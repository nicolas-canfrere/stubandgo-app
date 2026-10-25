import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/render';
import { AccountMenu } from './AccountMenu';

describe('AccountMenu', () => {
  it('offers to sign in when signed out', async () => {
    const { auth } = renderWithProviders(<AccountMenu />);

    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));

    expect(auth.signinRedirect).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Se déconnecter' })).not.toBeInTheDocument();
  });

  it('shows the member name and a sign-out button when signed in', async () => {
    const { auth } = renderWithProviders(<AccountMenu />, { user: { name: 'Camille Contrôle' } });

    expect(screen.getByText('Camille Contrôle')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Se connecter' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }));
    expect(auth.signoutRedirect).toHaveBeenCalled();
  });
});
