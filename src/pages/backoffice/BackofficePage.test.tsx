import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { API_URL } from '../../api/client';
import { App } from '../../App';
import { draftEvent, organizationAdmin, problemBody } from '../../test/fixtures';
import { renderWithProviders } from '../../test/render';
import { server } from '../../test/server';

const eventsUrl = `${API_URL}/api/backoffice/events`;

const published = {
  id: '01JAE5Z8Q3M4N6P7R8S9T0V1W3',
  title: 'Concert Intimiste',
  startsAt: '2026-12-09T19:00:00Z',
  status: 'published',
  locked: false,
};
const lockedEvent = {
  id: '01JAE5Z8Q3M4N6P7R8S9T0V1W4',
  title: 'Le Malade imaginaire',
  startsAt: '2026-12-24T19:00:00Z',
  status: 'published',
  locked: true,
};
const draft = {
  id: draftEvent.id,
  title: draftEvent.title,
  startsAt: draftEvent.startsAt,
  status: 'draft',
  locked: false,
};

describe('organization space access', () => {
  it('starts the sign-in, coming back to /espace, when nobody is signed in', () => {
    const { auth } = renderWithProviders(<App />, { route: '/espace' });

    expect(auth.signinRedirect).toHaveBeenCalledWith({ state: '/espace' });
  });

  it("tells a member without the organization-admin role that the space isn't theirs", () => {
    renderWithProviders(<App />, {
      route: '/espace',
      user: {
        name: 'Camille',
        claims: { realm_access: { roles: ['organization-controller'] } },
      },
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      "Votre compte n'a pas le rôle d'administrateur d'organisation.",
    );
    expect(screen.queryByRole('heading', { name: 'Événements' })).not.toBeInTheDocument();
  });

  it('offers the ORGANIZATION sign-in again, with the organization token, when the session expired', async () => {
    const seen: Array<string | null> = [];
    server.use(
      http.get(eventsUrl, ({ request }) => {
        seen.push(request.headers.get('Authorization'));
        return HttpResponse.json(problemBody('unauthorized', 401, 'expired'), { status: 401 });
      }),
    );
    const { auth } = renderWithProviders(<App />, {
      route: '/espace',
      user: { ...organizationAdmin, accessToken: 'org-token', platformAccessToken: 'staff-token' },
    });

    await userEvent.click(await screen.findByRole('button', { name: 'Se reconnecter' }));

    expect(seen).toEqual(['Bearer org-token']);
    expect(auth.signinRedirect).toHaveBeenCalledExactlyOnceWith({ state: '/espace' });
  });
});

describe('EventListPage', () => {
  it('lists the events with date in Paris time, status and lock', async () => {
    server.use(
      http.get(eventsUrl, () => HttpResponse.json({ events: [draft, published, lockedEvent] })),
    );

    renderWithProviders(<App />, { route: '/espace', user: organizationAdmin });

    const draftRow = await screen.findByRole('row', { name: /Soirée Rock/ });
    expect(within(draftRow).getByRole('link', { name: 'Soirée Rock' })).toHaveAttribute(
      'href',
      `/espace/events/${draft.id}`,
    );
    expect(within(draftRow).getByText('mer. 25 nov. 2026 · 20:00')).toBeInTheDocument();
    expect(within(draftRow).getByText('Brouillon')).toBeInTheDocument();
    expect(within(draftRow).queryByText('Verrouillé')).not.toBeInTheDocument();
    const publishedRow = screen.getByRole('row', { name: /Concert Intimiste/ });
    expect(within(publishedRow).getByText('Publié')).toBeInTheDocument();
    expect(within(publishedRow).queryByText('Verrouillé')).not.toBeInTheDocument();
    const lockedRow = screen.getByRole('row', { name: /Le Malade imaginaire/ });
    expect(within(lockedRow).getByText('Verrouillé')).toBeInTheDocument();
    expect(within(lockedRow).getByRole('link', { name: 'Ventes' })).toHaveAttribute(
      'href',
      `/espace/events/${lockedEvent.id}/sales`,
    );
    expect(screen.getByRole('link', { name: 'Nouvel événement' })).toHaveAttribute(
      'href',
      '/espace/events/new',
    );
  });

  it('says so when the organization has no event', async () => {
    server.use(http.get(eventsUrl, () => HttpResponse.json({ events: [] })));

    renderWithProviders(<App />, { route: '/espace', user: organizationAdmin });

    expect(await screen.findByText("Aucun événement pour l'instant.")).toBeInTheDocument();
  });

  it('shows a translated message when the API cannot be reached', async () => {
    server.use(http.get(eventsUrl, () => HttpResponse.error()));

    renderWithProviders(<App />, { route: '/espace', user: organizationAdmin });

    expect(await screen.findByRole('heading', { name: 'API injoignable' })).toBeInTheDocument();
  });
});
