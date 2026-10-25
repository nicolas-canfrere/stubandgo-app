import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from 'react-oidc-context';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { setAccessTokenSource } from './api/client';
import { onSigninCallback, userManager } from './auth/oidcConfig';
import './index.css';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
setAccessTokenSource(async () => (await userManager.getUser())?.access_token ?? null);
const root = document.getElementById('root');

if (root === null) {
  throw new Error('Missing #root element');
}

createRoot(root).render(
  <StrictMode>
    <AuthProvider userManager={userManager} onSigninCallback={onSigninCallback}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </AuthProvider>
  </StrictMode>,
);
