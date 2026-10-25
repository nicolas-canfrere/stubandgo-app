import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { AuthContext, type AuthContextProps } from 'react-oidc-context';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { setAccessTokenSource } from '../api/client';

type Route = string | { pathname: string; state?: unknown };

/** A simulated signed-in user; Keycloak is never contacted. */
export type TestUser = {
  name: string;
  accessToken?: string;
  claims?: Record<string, unknown>;
};

export function renderWithProviders(
  ui: ReactElement,
  { route = '/', user }: { route?: Route; user?: TestUser } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const accessToken = user?.accessToken ?? 'test-access-token';
  setAccessTokenSource(async () => (user ? accessToken : null));
  const auth = {
    isLoading: false,
    isAuthenticated: user !== undefined,
    user: user ? { access_token: accessToken, profile: { name: user.name, ...user.claims } } : null,
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
