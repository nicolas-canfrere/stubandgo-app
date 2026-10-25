import { useAuth } from 'react-oidc-context';
import { readMember } from '../auth/member';

export function AccountMenu() {
  const { isAuthenticated, user, signinRedirect, signoutRedirect } = useAuth();
  const member = isAuthenticated && user ? readMember(user.profile) : null;

  if (member === null) {
    return (
      <button
        type="button"
        className="ml-auto text-slate-600 hover:text-slate-900"
        onClick={() => void signinRedirect()}
      >
        Se connecter
      </button>
    );
  }

  return (
    <div className="ml-auto flex items-center gap-3">
      <span>{member.name}</span>
      <button
        type="button"
        className="text-slate-600 hover:text-slate-900"
        onClick={() => void signoutRedirect()}
      >
        Se déconnecter
      </button>
    </div>
  );
}
