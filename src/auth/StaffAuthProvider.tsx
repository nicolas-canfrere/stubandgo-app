import type { ReactNode } from 'react';
import { AuthProvider } from 'react-oidc-context';
import { onSigninCallback } from './oidcConfig';
import { staffUserManager } from './staffOidcConfig';

/** Scopes `useAuth` to the staff realm for the platform space; the rest of the app keeps its own. */
export function StaffAuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthProvider userManager={staffUserManager} onSigninCallback={onSigninCallback}>
      {children}
    </AuthProvider>
  );
}
