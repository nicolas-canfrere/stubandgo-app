import createClient from 'openapi-fetch';
import type { paths } from './schema';

export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

// Resolve fetch lazily: openapi-fetch otherwise captures globalThis.fetch when the client is
// created, before MSW patches it in tests.
export const api = createClient<paths>({
  baseUrl: API_URL,
  fetch: (request) => globalThis.fetch(request),
});
