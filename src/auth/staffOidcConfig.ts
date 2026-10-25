import { UserManager, WebStorageStateStore } from 'oidc-client-ts';

const authority: string =
  import.meta.env.VITE_STAFF_OIDC_AUTHORITY ?? 'http://localhost:8180/realms/stubandgo-staff';
const clientId: string = import.meta.env.VITE_STAFF_OIDC_CLIENT_ID ?? 'stubandgo-staff-cli';

// The staff realm has no « email » client scope (Keycloak answers invalid_scope): never request it.
// Second realm, second UserManager: its own callback and its own storage keys, so the staff and
// organization sign-ins never share a user or a pending authorization request.
export const staffOidcConfig = {
  authority,
  client_id: clientId,
  redirect_uri: `${window.location.origin}/plateforme/auth/callback`,
  post_logout_redirect_uri: `${window.location.origin}/`,
  scope: 'openid profile',
  automaticSilentRenew: true,
  userStore: new WebStorageStateStore({ store: window.sessionStorage, prefix: 'oidc.staff.' }),
  stateStore: new WebStorageStateStore({ store: window.sessionStorage, prefix: 'oidc.staff.' }),
};

export const staffUserManager = new UserManager(staffOidcConfig);
