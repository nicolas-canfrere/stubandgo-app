import { http, HttpResponse } from 'msw';
import { server } from '../test/server';
import { api, API_URL, setAccessTokenSources } from './client';

function captureAuthorization() {
  const seen: Array<string | null> = [];
  server.use(
    http.get(`${API_URL}/api/events`, ({ request }) => {
      seen.push(request.headers.get('Authorization'));
      return HttpResponse.json([]);
    }),
    http.post(`${API_URL}/api/events/:eventId/scans`, ({ request }) => {
      seen.push(request.headers.get('Authorization'));
      return HttpResponse.json({ outcome: 'accepted' });
    }),
  );

  return seen;
}

const scan = () =>
  api.POST('/api/events/{eventId}/scans', {
    params: { path: { eventId: '01J' } },
    body: { token: 't' },
  });

const sources = (organizations: string | null, platform: string | null) =>
  setAccessTokenSources({
    organizations: async () => organizations,
    platform: async () => platform,
  });

function captureAll() {
  const seen: Record<string, string | null> = {};
  const record = (name: string) => (info: { request: Request }) => {
    seen[name] = info.request.headers.get('Authorization');
  };
  server.use(
    http.get(`${API_URL}/api/events`, (info) => {
      record('public')(info);
      return HttpResponse.json([]);
    }),
    http.post(`${API_URL}/api/events/:eventId/scans`, (info) => {
      record('scan')(info);
      return HttpResponse.json({ outcome: 'accepted' });
    }),
    http.get(`${API_URL}/api/backoffice/events`, (info) => {
      record('backoffice')(info);
      return HttpResponse.json([]);
    }),
    http.get(`${API_URL}/api/platform/organizations`, (info) => {
      record('platform')(info);
      return HttpResponse.json({ organizations: [] });
    }),
  );

  return seen;
}

describe('bearer middleware', () => {
  afterEach(() => sources(null, null));

  it('adds the organizations token to the scan request when signed in', async () => {
    sources('org-token', 'staff-token');
    const seen = captureAuthorization();

    await scan();

    expect(seen).toEqual(['Bearer org-token']);
  });

  it('leaves public calls anonymous when signed in', async () => {
    sources('org-token', 'staff-token');
    const seen = captureAuthorization();

    await api.GET('/api/events');

    expect(seen).toEqual([null]);
  });

  it('sends no header when signed out', async () => {
    const seen = captureAuthorization();

    await scan();

    expect(seen).toEqual([null]);
  });

  it('gives every route family its own token or none', async () => {
    sources('org-token', 'staff-token');
    const seen = captureAll();

    await scan();
    await api.GET('/api/events');
    await api.GET('/api/backoffice/events');
    await api.GET('/api/platform/organizations');

    expect(seen).toEqual({
      scan: 'Bearer org-token',
      public: null,
      platform: 'Bearer staff-token',
      backoffice: 'Bearer org-token',
    });
  });

  it('adds no header when the matching source has no token', async () => {
    sources('org-token', null);
    const seen = captureAll();

    await api.GET('/api/platform/organizations');

    expect(seen).toEqual({ platform: null });
  });
});
