import { UserManager, WebStorageStateStore } from 'oidc-client-ts';
import type { AuthProviderProps } from 'react-oidc-context';

const authority: string =
  import.meta.env.VITE_OIDC_AUTHORITY ?? 'http://localhost:8180/realms/stubandgo';
const clientId: string = import.meta.env.VITE_OIDC_CLIENT_ID ?? 'stubandgo-app';

// Authorization code + PKCE (S256) is the oidc-client-ts default for a public client.
export const oidcConfig = {
  authority,
  client_id: clientId,
  redirect_uri: `${window.location.origin}/auth/callback`,
  post_logout_redirect_uri: `${window.location.origin}/`,
  scope: 'openid profile email',
  automaticSilentRenew: true,
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
};

export const userManager = new UserManager(oidcConfig);

/** Removes the authorization response (code, state) from the URL once the sign-in is done. */
export const onSigninCallback: AuthProviderProps['onSigninCallback'] = () => {
  window.history.replaceState({}, document.title, window.location.pathname);
};
