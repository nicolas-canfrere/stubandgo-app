import { http, HttpResponse } from 'msw';
import { server } from '../test/server';
import { api, API_URL, setAccessTokenSource } from './client';

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

describe('bearer middleware', () => {
  afterEach(() => setAccessTokenSource(async () => null));

  it('adds the bearer token to the scan request when signed in', async () => {
    setAccessTokenSource(async () => 'access-123');
    const seen = captureAuthorization();

    await scan();

    expect(seen).toEqual(['Bearer access-123']);
  });

  it('leaves public calls anonymous when signed in', async () => {
    setAccessTokenSource(async () => 'access-123');
    const seen = captureAuthorization();

    await api.GET('/api/events');

    expect(seen).toEqual([null]);
  });

  it('sends no header when signed out', async () => {
    const seen = captureAuthorization();

    await scan();

    expect(seen).toEqual([null]);
  });
});
