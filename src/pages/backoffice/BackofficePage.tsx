import { useAuth } from 'react-oidc-context';
import { NavLink, Outlet } from 'react-router-dom';
import { readMember } from '../../auth/member';
import { RequireLogin } from '../../auth/RequireLogin';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'font-semibold text-indigo-700' : 'text-slate-600 hover:text-slate-900';

/** The organization space: signed in with the organizations' realm, restricted to administrators. */
export function BackofficePage() {
  return (
    <RequireLogin>
      <BackofficeSpace />
    </RequireLogin>
  );
}

function BackofficeSpace() {
  const { user } = useAuth();
  const member = user ? readMember(user.profile) : null;

  if (!member?.isOrganizationAdmin) {
    return (
      <p role="alert" className="text-red-700">
        Votre compte n'a pas le rôle d'administrateur d'organisation.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Menu de l'espace" className="flex gap-4">
        <NavLink to="/espace" end className={linkClass}>
          Événements
        </NavLink>
        <NavLink to="/espace/invitations" className={linkClass}>
          Inviter un membre
        </NavLink>
      </nav>
      <Outlet />
    </div>
  );
}
