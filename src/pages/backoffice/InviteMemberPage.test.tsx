import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { API_URL } from '../../api/client';
import { App } from '../../App';
import { organizationAdmin, problemBody } from '../../test/fixtures';
import { renderWithProviders } from '../../test/render';
import { server } from '../../test/server';

const invitationsUrl = `${API_URL}/api/backoffice/invitations`;

function renderInvitation() {
  return renderWithProviders(<App />, { route: '/espace/invitations', user: organizationAdmin });
}

describe('InviteMemberPage', () => {
  it('invites a controller and confirms it', async () => {
    let sent: unknown;
    server.use(
      http.post(invitationsUrl, async ({ request }) => {
        sent = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderInvitation();

    await userEvent.type(screen.getByLabelText('Email'), ' nouveau@rock-asso.test ');
    await userEvent.selectOptions(screen.getByLabelText('Rôle'), 'controller');
    await userEvent.click(screen.getByRole('button', { name: "Envoyer l'invitation" }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Invitation envoyée à nouveau@rock-asso.test.',
    );
    expect(sent).toEqual({ email: 'nouveau@rock-asso.test', role: 'controller' });
    expect(screen.getByLabelText('Email')).toHaveValue('');
  });

  it.each([
    ['member_already_exists', 409, 'Ce membre existe déjà : cette adresse email a déjà un compte.'],
    [
      'identity_provider_unavailable',
      502,
      "Le fournisseur d'identité ne répond pas. Réessayez dans un instant.",
    ],
    ['forbidden', 403, "Votre compte n'est pas administrateur de cette organisation."],
  ])('translates %s', async (code, status, message) => {
    server.use(
      http.post(invitationsUrl, () =>
        HttpResponse.json(problemBody(code, status, 'x'), { status }),
      ),
    );
    renderInvitation();

    await userEvent.type(screen.getByLabelText('Email'), 'nouveau@rock-asso.test');
    await userEvent.click(screen.getByRole('button', { name: "Envoyer l'invitation" }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
