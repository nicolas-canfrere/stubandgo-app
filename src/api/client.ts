import createClient, { type Middleware } from 'openapi-fetch';
import type { paths } from './schema';

export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

type AccessTokenSource = () => Promise<string | null>;
type AccessTokenSources = { organizations: AccessTokenSource; platform: AccessTokenSource };

let sources: AccessTokenSources = { organizations: async () => null, platform: async () => null };

/** Registers where each realm's access token comes from (the UserManagers); never stored here. */
export function setAccessTokenSources(next: AccessTokenSources): void {
  sources = next;
}

// The scan and the organization space are called with an organization member's token, the
// platform routes with a staff token. Every other route stays anonymous: the API validates any
// presented token, so an expired one sent to a public route would turn public browsing into 401s.
const SCAN_PATH = /^\/api\/events\/[^/]+\/scans$/;
const BACKOFFICE_PATH = /^\/api\/backoffice\//;
const PLATFORM_PATH = /^\/api\/platform\//;

function sourceFor(method: string, pathname: string): AccessTokenSource | null {
  if (PLATFORM_PATH.test(pathname)) {
    return sources.platform;
  }
  if (BACKOFFICE_PATH.test(pathname) || (method === 'POST' && SCAN_PATH.test(pathname))) {
    return sources.organizations;
  }

  return null;
}

const bearer: Middleware = {
  async onRequest({ request }) {
    const source = sourceFor(request.method, new URL(request.url).pathname);
    if (source === null) {
      return undefined;
    }
    const token = await source();
    if (token !== null) {
      request.headers.set('Authorization', `Bearer ${token}`);
    }

    return request;
  },
};

// Resolve fetch lazily: openapi-fetch otherwise captures globalThis.fetch when the client is
// created, before MSW patches it in tests.
export const api = createClient<paths>({
  baseUrl: API_URL,
  fetch: (request) => globalThis.fetch(request),
});
api.use(bearer);
