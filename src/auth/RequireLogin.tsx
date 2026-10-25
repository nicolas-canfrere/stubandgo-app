import { useEffect, type ReactNode } from 'react';
import { useAuth } from 'react-oidc-context';
import { useLocation } from 'react-router-dom';

/** Renders its children once signed in; otherwise sends the visitor to Keycloak and back here. */
export function RequireLogin({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const location = useLocation();
  const { isLoading, isAuthenticated, activeNavigator, error, signinRedirect } = auth;
  const mustSignIn = !isLoading && !isAuthenticated && activeNavigator === undefined && !error;
  const returnTo = `${location.pathname}${location.search}`;

  useEffect(() => {
    if (mustSignIn) {
      void signinRedirect({ state: returnTo });
    }
  }, [mustSignIn, signinRedirect, returnTo]);

  if (isAuthenticated) {
    return <>{children}</>;
  }
  if (error) {
    return (
      <p role="alert" className="text-red-700">
        La connexion a échoué.{' '}
        <button
          type="button"
          className="underline"
          onClick={() => void signinRedirect({ state: returnTo })}
        >
          Se reconnecter
        </button>
      </p>
    );
  }

  return <p className="text-slate-600">Connexion en cours…</p>;
}
