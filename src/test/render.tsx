import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { AuthContext, type AuthContextProps } from 'react-oidc-context';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { setAccessTokenSources } from '../api/client';

type Route = string | { pathname: string; state?: unknown };

/** A simulated signed-in user; Keycloak is never contacted. */
export type TestUser = {
  name: string;
  accessToken?: string;
  claims?: Record<string, unknown>;
  /** The state given to signinRedirect, handed back on the callback. */
  state?: unknown;
};

export function renderWithProviders(
  ui: ReactElement,
  { route = '/', user, authError }: { route?: Route; user?: TestUser; authError?: Error } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const accessToken = user?.accessToken ?? 'test-access-token';
  const token = async () => (user ? accessToken : null);
  setAccessTokenSources({ organizations: token, platform: token });
  const auth = {
    isLoading: false,
    isAuthenticated: user !== undefined,
    error: authError,
    user: user
      ? {
          access_token: accessToken,
          state: user.state,
          profile: { name: user.name, ...user.claims },
        }
      : null,
    signinRedirect: vi.fn().mockResolvedValue(undefined),
    signoutRedirect: vi.fn().mockResolvedValue(undefined),
  };

  const result = render(
    <AuthContext.Provider value={auth as unknown as AuthContextProps}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </QueryClientProvider>
    </AuthContext.Provider>,
  );

  return { ...result, auth };
}
