import { useAuth } from 'react-oidc-context';
import { Navigate } from 'react-router-dom';

/** Only a same-origin path is a valid return target: no `//host`, no `/\host`, no absolute URL. */
function returnPath(state: unknown): string {
  if (typeof state !== 'string' || !state.startsWith('/') || /^\/[/\\]/.test(state)) {
    return '/';
  }

  return state;
}

/** The provider exchanges the authorization code; once signed in, go back to the requested page. */
export function AuthCallbackPage() {
  const { isLoading, isAuthenticated, error, user, signinRedirect } = useAuth();

  if (isAuthenticated) {
    const target = returnPath(user?.state);

    return <Navigate to={target} replace />;
  }
  if (error) {
    return (
      <p role="alert" className="text-red-700">
        La connexion a échoué.{' '}
        <button type="button" className="underline" onClick={() => void signinRedirect()}>
          Réessayer
        </button>
      </p>
    );
  }

  return <p className="text-slate-600">{isLoading ? 'Connexion en cours…' : 'Connexion…'}</p>;
}
