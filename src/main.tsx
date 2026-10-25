import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from 'react-oidc-context';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { setAccessTokenSources } from './api/client';
import { onSigninCallback, userManager } from './auth/oidcConfig';
import { staffUserManager } from './auth/staffOidcConfig';
import './index.css';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
setAccessTokenSources({
  organizations: async () => (await userManager.getUser())?.access_token ?? null,
  platform: async () => (await staffUserManager.getUser())?.access_token ?? null,
});
// The staff realm has its own provider (scoped to /plateforme) and its own callback: the
// organizations provider must leave that callback alone.
const isStaffSpace = window.location.pathname.startsWith('/plateforme');
const root = document.getElementById('root');

if (root === null) {
  throw new Error('Missing #root element');
}

createRoot(root).render(
  <StrictMode>
    <AuthProvider
      userManager={userManager}
      onSigninCallback={onSigninCallback}
      skipSigninCallback={isStaffSpace}
    >
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </AuthProvider>
  </StrictMode>,
);
