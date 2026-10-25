import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { API_URL } from '../../api/client';
import type { components } from '../../api/schema';
import { problemBody } from '../../test/fixtures';
import { renderWithProviders } from '../../test/render';
import { server } from '../../test/server';
import { PlatformPage } from './PlatformPage';

type Organization = components['schemas']['OrganizationAdmin'];

const rock: Organization = {
  id: '01JAE5Z8Q3M4N6P7R8S9T0V3A1',
  name: 'Rock Asso',
  slug: 'demo-rock-asso',
  commissionBasisPoints: 300,
  status: 'active',
};
const fanfare: Organization = {
  id: '01JAE5Z8Q3M4N6P7R8S9T0V3A2',
  name: 'Fanfare',
  slug: 'fanfare',
  commissionBasisPoints: 275,
  status: 'pending_keycloak',
};

const staff = { name: 'Alex Plateforme', claims: { realm_access: { roles: ['platform-admin'] } } };
const organizationsUrl = `${API_URL}/api/platform/organizations`;

function serveOrganizations(initial: Organization[]) {
  const organizations = [...initial];
  const authorizations: Array<string | null> = [];
  server.use(
    http.get(organizationsUrl, ({ request }) => {
      authorizations.push(request.headers.get('Authorization'));
      return HttpResponse.json({ organizations });
    }),
  );

  return { organizations, authorizations };
}

function renderPlatform(user: Parameters<typeof renderWithProviders>[1] = { user: staff }) {
  return renderWithProviders(<PlatformPage />, { route: '/plateforme', ...user });
}

function rowOf(name: string) {
  return screen.getByRole('row', { name: new RegExp(name) });
}

describe('PlatformPage', () => {
  it('starts the staff sign-in when nobody is signed in', async () => {
    const { auth } = renderPlatform({});

    await waitFor(() => expect(auth.signinRedirect).toHaveBeenCalledWith({ state: '/plateforme' }));
  });

  it('tells a member without the platform-admin role that the space is not theirs', () => {
    renderPlatform({ user: { name: 'Camille', claims: { realm_access: { roles: [] } } } });

    expect(screen.getByRole('alert')).toHaveTextContent(
      "Votre compte n'a pas le rôle d'administrateur de la plateforme.",
    );
    expect(screen.queryByRole('heading', { name: 'Organisations' })).not.toBeInTheDocument();
  });

  it('offers the staff sign-in again, with the staff token, when the staff session expired', async () => {
    const seen: Array<string | null> = [];
    server.use(
      http.get(organizationsUrl, ({ request }) => {
        seen.push(request.headers.get('Authorization'));
        return HttpResponse.json(problemBody('unauthorized', 401, 'expired'), { status: 401 });
      }),
    );
    const { auth } = renderPlatform({
      user: { ...staff, accessToken: 'org-token', platformAccessToken: 'staff-token' },
    });

    await userEvent.click(await screen.findByRole('button', { name: 'Se reconnecter' }));

    expect(seen).toEqual(['Bearer staff-token']);
    expect(auth.signinRedirect).toHaveBeenCalledExactlyOnceWith({ state: '/plateforme' });
  });

  it('lets a member without the platform-admin role sign out', async () => {
    const { auth } = renderPlatform({ user: { name: 'Camille', claims: {} } });

    await userEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }));

    expect(auth.signoutRedirect).toHaveBeenCalled();
  });

  it('lists the organizations with their commission and status, using the staff token', async () => {
    const { authorizations } = serveOrganizations([rock, fanfare]);

    renderPlatform({ user: { ...staff, accessToken: 'staff-token' } });

    const active = await screen.findByRole('row', { name: /Rock Asso/ });
    expect(within(active).getByText('demo-rock-asso')).toBeInTheDocument();
    expect(within(active).getByText('3 %')).toBeInTheDocument();
    expect(within(active).getByText('Active')).toBeInTheDocument();
    expect(within(active).queryByRole('button', { name: 'Relancer' })).not.toBeInTheDocument();
    const pending = rowOf('Fanfare');
    expect(within(pending).getByText('2,75 %')).toBeInTheDocument();
    expect(within(pending).getByText('En attente de Keycloak')).toBeInTheDocument();
    expect(authorizations[0]).toBe('Bearer staff-token');
  });

  it('creates an organization with the rate converted to basis points and shows it', async () => {
    const state = serveOrganizations([]);
    let sent: unknown;
    server.use(
      http.post(organizationsUrl, async ({ request }) => {
        sent = await request.json();
        state.organizations.push({ ...rock, name: 'Jazz Club', slug: 'jazz-club' });
        return HttpResponse.json(state.organizations[0], { status: 201 });
      }),
    );
    renderPlatform();
    await screen.findByRole('heading', { name: 'Organisations' });

    await userEvent.type(screen.getByLabelText('Nom'), 'Jazz Club');
    await userEvent.type(screen.getByLabelText('Identifiant (slug)'), 'jazz-club');
    await userEvent.type(screen.getByLabelText('Commission (%)'), '2,75');
    await userEvent.click(screen.getByRole('button', { name: "Créer l'organisation" }));

    expect(await screen.findByRole('row', { name: /Jazz Club/ })).toBeInTheDocument();
    expect(sent).toEqual({ name: 'Jazz Club', slug: 'jazz-club', commissionBasisPoints: 275 });
    expect(screen.getByLabelText('Nom')).toHaveValue('');
  });

  it('does not send a commission that is not a valid percentage', async () => {
    serveOrganizations([]);
    renderPlatform();
    await screen.findByRole('heading', { name: 'Organisations' });

    await userEvent.type(screen.getByLabelText('Nom'), 'Jazz Club');
    await userEvent.type(screen.getByLabelText('Identifiant (slug)'), 'jazz-club');
    await userEvent.type(screen.getByLabelText('Commission (%)'), '120');
    await userEvent.click(screen.getByRole('button', { name: "Créer l'organisation" }));

    expect(screen.getByRole('alert')).toHaveTextContent('Commission invalide');
  });

  it.each([
    ['an uppercase letter', 'Jazz-Club'],
    ['a double hyphen', 'jazz--club'],
    ['a leading hyphen', '-jazz'],
    ['a space', 'jazz club'],
    ['fewer than 3 characters', 'jc'],
    ['more than 64 characters', 'j'.repeat(65)],
  ])('does not send a slug with %s', async (_name, slug) => {
    serveOrganizations([]);
    let called = false;
    server.use(
      http.post(organizationsUrl, () => {
        called = true;
        return HttpResponse.json(rock, { status: 201 });
      }),
    );
    renderPlatform();
    await screen.findByRole('heading', { name: 'Organisations' });

    await userEvent.type(screen.getByLabelText('Nom'), 'Jazz Club');
    await userEvent.type(screen.getByLabelText('Identifiant (slug)'), slug);
    await userEvent.type(screen.getByLabelText('Commission (%)'), '3');
    await userEvent.click(screen.getByRole('button', { name: "Créer l'organisation" }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Identifiant invalide : 3 à 64 lettres minuscules, chiffres ou tirets simples entre eux.',
    );
    expect(called).toBe(false);
  });

  it('accepts a slug of exactly 3 and of exactly 64 characters', async () => {
    serveOrganizations([]);
    const sent: unknown[] = [];
    server.use(
      http.post(organizationsUrl, async ({ request }) => {
        sent.push(await request.json());
        return HttpResponse.json(rock, { status: 201 });
      }),
    );
    renderPlatform();
    await screen.findByRole('heading', { name: 'Organisations' });

    for (const slug of ['a1b', `${'a'.repeat(31)}-${'b'.repeat(32)}`]) {
      await userEvent.type(screen.getByLabelText('Nom'), 'Jazz Club');
      await userEvent.type(screen.getByLabelText('Identifiant (slug)'), slug);
      await userEvent.type(screen.getByLabelText('Commission (%)'), '3');
      await userEvent.click(screen.getByRole('button', { name: "Créer l'organisation" }));
      await waitFor(() => expect(screen.getByLabelText('Nom')).toHaveValue(''));
    }

    expect(sent).toEqual([
      { name: 'Jazz Club', slug: 'a1b', commissionBasisPoints: 300 },
      {
        name: 'Jazz Club',
        slug: `${'a'.repeat(31)}-${'b'.repeat(32)}`,
        commissionBasisPoints: 300,
      },
    ]);
  });

  it('does not send a blank name', async () => {
    serveOrganizations([]);
    let called = false;
    server.use(
      http.post(organizationsUrl, () => {
        called = true;
        return HttpResponse.json(rock, { status: 201 });
      }),
    );
    renderPlatform();
    await screen.findByRole('heading', { name: 'Organisations' });

    await userEvent.type(screen.getByLabelText('Nom'), '   ');
    await userEvent.type(screen.getByLabelText('Identifiant (slug)'), 'jazz-club');
    await userEvent.type(screen.getByLabelText('Commission (%)'), '3');
    await userEvent.click(screen.getByRole('button', { name: "Créer l'organisation" }));

    expect(screen.getByRole('alert')).toHaveTextContent('Nom manquant');
    expect(called).toBe(false);
  });

  it('tells a staff member refused by the API that they are not a platform administrator', async () => {
    serveOrganizations([]);
    server.use(
      http.post(organizationsUrl, () =>
        HttpResponse.json(problemBody('forbidden', 403, 'no'), { status: 403 }),
      ),
    );
    renderPlatform();
    await screen.findByRole('heading', { name: 'Organisations' });

    await userEvent.type(screen.getByLabelText('Nom'), 'Jazz Club');
    await userEvent.type(screen.getByLabelText('Identifiant (slug)'), 'jazz-club');
    await userEvent.type(screen.getByLabelText('Commission (%)'), '3');
    await userEvent.click(screen.getByRole('button', { name: "Créer l'organisation" }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Votre compte n'a pas le rôle d'administrateur de la plateforme.",
    );
    expect(screen.queryByText(/billet/)).not.toBeInTheDocument();
  });

  it('lists the violations of a malformed payload', async () => {
    serveOrganizations([]);
    server.use(
      http.post(organizationsUrl, () =>
        HttpResponse.json(
          {
            ...problemBody('validation_failed', 422, 'invalid'),
            violations: [
              {
                propertyPath: 'commissionBasisPoints',
                message: 'This value should be of type int.',
              },
            ],
          },
          { status: 422 },
        ),
      ),
    );
    renderPlatform();
    await screen.findByRole('heading', { name: 'Organisations' });

    await userEvent.type(screen.getByLabelText('Nom'), 'Jazz Club');
    await userEvent.type(screen.getByLabelText('Identifiant (slug)'), 'jazz-club');
    await userEvent.type(screen.getByLabelText('Commission (%)'), '3');
    await userEvent.click(screen.getByRole('button', { name: "Créer l'organisation" }));

    expect(
      await screen.findByText('commissionBasisPoints : This value should be of type int.'),
    ).toBeInTheDocument();
  });

  it('explains a slug already taken', async () => {
    serveOrganizations([]);
    server.use(
      http.post(organizationsUrl, () =>
        HttpResponse.json(problemBody('organization_slug_taken', 409, 'taken'), { status: 409 }),
      ),
    );
    renderPlatform();
    await screen.findByRole('heading', { name: 'Organisations' });

    await userEvent.type(screen.getByLabelText('Nom'), 'Jazz Club');
    await userEvent.type(screen.getByLabelText('Identifiant (slug)'), 'jazz-club');
    await userEvent.type(screen.getByLabelText('Commission (%)'), '3');
    await userEvent.click(screen.getByRole('button', { name: "Créer l'organisation" }));

    expect(await screen.findByRole('alert')).toHaveTextContent('identifiant est déjà utilisé');
  });

  it('retries the provisioning of a pending organization', async () => {
    const state = serveOrganizations([fanfare]);
    server.use(
      http.post(`${organizationsUrl}/${fanfare.id}/provisioning`, () => {
        state.organizations[0] = { ...fanfare, status: 'active' };
        return HttpResponse.json(state.organizations[0]);
      }),
    );
    renderPlatform();

    await userEvent.click(
      within(await screen.findByRole('row', { name: /Fanfare/ })).getByRole('button', {
        name: 'Relancer',
      }),
    );

    expect(await within(rowOf('Fanfare')).findByText('Active')).toBeInTheDocument();
  });

  it('shows the identity provider failure when the retry fails with 502', async () => {
    serveOrganizations([fanfare]);
    server.use(
      http.post(`${organizationsUrl}/${fanfare.id}/provisioning`, () =>
        HttpResponse.json(problemBody('identity_provider_unavailable', 502, 'down'), {
          status: 502,
        }),
      ),
    );
    renderPlatform();

    await userEvent.click(await screen.findByRole('button', { name: 'Relancer' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Le fournisseur d'identité ne répond pas",
    );
    expect(screen.getByText('En attente de Keycloak')).toBeInTheDocument();
  });

  it('changes the commission rate, converted to basis points', async () => {
    const state = serveOrganizations([rock]);
    let sent: unknown;
    server.use(
      http.put(`${organizationsUrl}/${rock.id}/commission-rate`, async ({ request }) => {
        sent = await request.json();
        state.organizations[0] = { ...rock, commissionBasisPoints: 450 };
        return HttpResponse.json(state.organizations[0]);
      }),
    );
    renderPlatform();
    const field = await screen.findByLabelText('Nouveau taux de Rock Asso (%)');

    await userEvent.clear(field);
    await userEvent.type(field, '4,5');
    await userEvent.click(screen.getByRole('button', { name: 'Modifier le taux de Rock Asso' }));

    expect(await within(rowOf('Rock Asso')).findByText('4,5 %')).toBeInTheDocument();
    expect(sent).toEqual({ commissionBasisPoints: 450 });
  });

  it('invites a member and confirms it', async () => {
    serveOrganizations([rock, fanfare]);
    let sent: unknown;
    server.use(
      http.post(`${organizationsUrl}/${rock.id}/invitations`, async ({ request }) => {
        sent = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderPlatform();
    await screen.findByRole('row', { name: /Rock Asso/ });

    expect(screen.queryByRole('option', { name: 'Fanfare' })).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Organisation'), 'Rock Asso');
    await userEvent.type(screen.getByLabelText('Email'), 'nouveau@rock.test');
    await userEvent.selectOptions(screen.getByLabelText('Rôle'), 'Contrôleur');
    await userEvent.click(screen.getByRole('button', { name: "Envoyer l'invitation" }));

    expect(await screen.findByRole('status')).toHaveTextContent('nouveau@rock.test');
    expect(sent).toEqual({ email: 'nouveau@rock.test', role: 'controller' });
  });

  it('says the member already exists on a 409', async () => {
    serveOrganizations([rock]);
    server.use(
      http.post(`${organizationsUrl}/${rock.id}/invitations`, () =>
        HttpResponse.json(problemBody('member_already_exists', 409, 'exists'), { status: 409 }),
      ),
    );
    renderPlatform();
    await screen.findByRole('row', { name: /Rock Asso/ });

    await userEvent.selectOptions(screen.getByLabelText('Organisation'), 'Rock Asso');
    await userEvent.type(screen.getByLabelText('Email'), 'deja@rock.test');
    await userEvent.click(screen.getByRole('button', { name: "Envoyer l'invitation" }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Ce membre existe déjà');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
