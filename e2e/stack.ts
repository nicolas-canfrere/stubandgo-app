/** Where the end-to-end flow finds the four running services (all on the host, see compose.yaml). */
export const FRONT_URL = 'http://localhost:5173';
export const API_URL = 'http://localhost:8080';
export const MAILPIT_URL = 'http://localhost:8025';
export const KEYCLOAK_URL = 'http://localhost:8180';

/** The demo event the flow buys tickets for (created by `app:demo:load` in the API). */
export const DEMO_EVENT = 'Soirée Rock';
