# AGENTS.md

This is the React front of stubandgo (Vite + React 19 + TypeScript, single-page
application, no server-side rendering). The Symfony API lives in the separate
`stubandgo` repository and is the only source of truth. Check `package.json`
for the exact versions in use; every dependency is pinned to an exact version.

## Ask before generating

If the task doesn't specify, ask rather than guess:

- Does a business rule belong in the API rather than here? (The front only
  displays; it never duplicates a rule.)
- Which route and which API operation does the screen use?

If you can't ask, state the assumption and pick the smallest option.

## Conventions

These rules are project decisions; the design document in the separate
documentation repository (`recherches/specs/2026-10-25-stubandgo-front-l1-design.md`)
explains why.

### Layout

Intended structure (later tasks add the folders that do not exist yet):

- `src/api/`: typed API client (`openapi-fetch`), Problem Details error
  handling, TanStack Query hooks.
- `src/auth/`: Keycloak sign-in (`oidc-client-ts` + `react-oidc-context`):
  `oidcConfig.ts` (UserManager, `VITE_OIDC_*`), `member.ts` (`readMember` reads the
  organization and role claims), `staffOidcConfig.ts` (second UserManager,
  realm `stubandgo-staff`, own storage keys), `StaffAuthProvider.tsx` (scopes `useAuth` to the
  staff realm under `/plateforme`), `RequireLogin.tsx`. Access tokens are read from the
  UserManagers at request time: the organizations' token goes to the scan call and
  `/api/backoffice/*`, the staff token to `/api/platform/*`, nothing to other routes
  (`src/api/client.ts`); never log them.
- `src/money.ts`: parsers for typed amounts (`parseEuros`, `parsePercent`, integer cents and
  basis points) and `formatPercent`; `formatEuros` stays in `src/format.ts`.
- `src/pages/`: one component per route; `pages/platform/` is the staff space (`/plateforme`),
  `pages/backoffice/` the organization space (`/espace`, administrators only).
- `src/backoffice/eventDraft.ts`: the event form state and its conversion to the API body (euros
  to cents, Europe/Paris local time to an ISO 8601 date-time with offset). The back-office forms
  check the API's input rules (non-blank texts, capacity of at least 1, at least one tier, slug
  format) only to answer in French before the call; the API stays the authority, and a refusal it
  still sends (`invalid_value`) is shown with its `detail`.
- `src/components/`: reusable presentational components.
- `src/orders/`: order and payment flow.
- `src/scan/`: QR code scan (camera and image).
- `src/test/`: test tooling only (`setup.ts`, `server.ts` MSW server,
  `render.tsx` with `renderWithProviders`).
- `e2e/`: the Playwright end-to-end flows, run by `make e2e` against the real
  stacks: `l1-flow.spec.ts` (purchase, then scan as `controleur.rock`) and
  `l2-isolation.spec.ts` (another organization's controller, a non-controller,
  sign-out); `keycloak.ts` signs in through the real Keycloak form,
  `check-stack.ts` checks the stacks first. Excluded from
  Vitest, type-checked through `tsconfig.e2e.json`.
- `src/App.tsx` (layout and navigation), `src/main.tsx` (providers and
  router), `src/index.css` (Tailwind).

### Naming

- Code, identifiers, comments, commits and this file are in English; the user
  interface is in French.
- Components and their files: `PascalCase.tsx` (one exported component per
  file, named export). Hooks: `useThing`. Other modules: `camelCase.ts`.
- Tests sit next to the code: `Thing.test.ts(x)`.

### API types

- API types are generated from the versioned copy `openapi/openapi.yaml`
  (`openapi-typescript`). Never write an API type by hand.
- Errors follow RFC 9457 (`application/problem+json`); the code is the last
  segment of `type` (`/problems/<code>`).
- Dates come in UTC (`Z` suffix) and are displayed in `Europe/Paris`; amounts
  come in cents and are displayed through `Intl.NumberFormat('fr-FR', ...)`,
  never as floats.
- The ticket token is a bearer secret: never display it, never log it
  (no `console.*` on that path).

### Tooling and commits

- Everything runs in the Node container pinned by `NODE_VERSION` in the
  `Makefile` (mirrored in `compose.yaml` and `.env`); Node is not needed on the
  host. Dependencies are pinned (`save-exact` in `.npmrc`),
  `package-lock.json` is committed and installed with `npm ci`.
- Commits follow Conventional Commits, in English, without a
  `Co-Authored-By` trailer.

## Testing

Vitest with jsdom and Testing Library, configured in `vite.config.ts`;
`src/test/setup.ts` starts the MSW `server` with
`onUnhandledFrame: 'error'` (the MSW 3 name of `onUnhandledRequest`).

- Tests never reach the real network: every request is answered by an MSW
  handler declared in the test (`server.use(...)`); an unhandled request
  fails the test.
- Render with `renderWithProviders(ui, { route })` from `src/test/render.tsx`
  (QueryClient with retries disabled + `MemoryRouter` + a mocked auth context; pass
  `user: { name }` to simulate a signed-in member, Keycloak is never contacted).
- Query by role and accessible name, as a user would.
- `make test`: the whole suite.
- `make e2e` (separate from `make ci`): the Playwright flow in the
  `mcr.microsoft.com/playwright` image (`PLAYWRIGHT_VERSION`, kept equal to the
  `@playwright/test` pin), on the host network. It needs the API stack, Keycloak
  included (http://localhost:8180, realm `stubandgo`, healthy), with
  `app:demo:load`, and the front (`make up`); it starts neither.

## Feature workflow

Every change follows these steps, in order:

1. **Test first.** Write the test, run `make test`, confirm it fails for the
   right reason.
2. **Implement** the minimum code that makes it pass.
3. **Gate.** Run `make ci`.

`make ci` runs, in order: `lint` (ESLint + Prettier check), `typecheck`
(`tsc`), `api-types-check` (`schema.d.ts` matches `openapi/openapi.yaml`),
`test` (Vitest), `build` (Vite). After an API contract change, run
`make api-types` (copies `$(API_DIR)/openapi.yaml`, default `../stubandgo`, then
regenerates `src/api/schema.d.ts`). Run `npm run format` through
`make`'s container (or `docker compose run --rm --no-deps node npm run format`)
to fix formatting. No mutation testing on the front.

## Discover, don't guess

Node and npm are not installed on the host. Use `make help` to list targets;
`make up` serves http://localhost:5173 (API expected on `VITE_API_URL`,
default http://localhost:8080). Read installed sources under `node_modules/`
and the library docs rather than relying on memory: major versions move fast
(React 19, React Router 7, Tailwind 4, MSW 3, Vitest 5).
