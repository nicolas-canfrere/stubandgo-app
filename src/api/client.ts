import createClient, { type Middleware } from 'openapi-fetch';
import type { paths } from './schema';

export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

type AccessTokenSource = () => Promise<string | null>;

let accessTokenSource: AccessTokenSource = async () => null;

/** Registers where the access token comes from (the OIDC UserManager); never stored here. */
export function setAccessTokenSource(source: AccessTokenSource): void {
  accessTokenSource = source;
}

// Only the scan call is authenticated: the API validates any presented token, so an expired one
// sent to a public route would turn public browsing into 401s.
const SCAN_PATH = /^\/api\/events\/[^/]+\/scans$/;

const bearer: Middleware = {
  async onRequest({ request }) {
    if (request.method !== 'POST' || !SCAN_PATH.test(new URL(request.url).pathname)) {
      return undefined;
    }
    const token = await accessTokenSource();
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
