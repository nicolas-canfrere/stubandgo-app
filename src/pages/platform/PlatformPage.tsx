import { useProvisionOrganization, usePlatformOrganizations } from '../../api/platformQueries';
import { readMember } from '../../auth/member';
import { RequireLogin } from '../../auth/RequireLogin';
import { AccountMenu } from '../../components/AccountMenu';
import { StaffProblemNotice } from './StaffProblemNotice';
import { formatPercent } from '../../money';
import { useAuth } from 'react-oidc-context';
import { CommissionRateForm } from './CommissionRateForm';
import { InviteMemberForm } from './InviteMemberForm';
import { OrganizationForm } from './OrganizationForm';

/** The platform space: signed in with the staff realm, restricted to platform administrators. */
export function PlatformPage() {
  return (
    <RequireLogin>
      <PlatformSpace />
    </RequireLogin>
  );
}

function PlatformSpace() {
  const { user } = useAuth();
  const member = user ? readMember(user.profile) : null;

  if (!member?.isPlatformAdmin) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center">
          <AccountMenu />
        </div>
        <p role="alert" className="text-red-700">
          Votre compte n'a pas le rôle d'administrateur de la plateforme.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center">
        <h1 className="text-2xl font-bold">Plateforme</h1>
        <AccountMenu />
      </div>
      <OrganizationList />
    </div>
  );
}

function OrganizationList() {
  const organizations = usePlatformOrganizations();
  const provision = useProvisionOrganization();

  if (organizations.isPending) {
    return <p className="text-slate-600">Chargement…</p>;
  }
  if (organizations.isError) {
    return <StaffProblemNotice problem={organizations.error} />;
  }

  return (
    <>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Organisations</h2>
        <table className="w-full text-left">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Identifiant</th>
              <th>Commission</th>
              <th>Statut</th>
              <th>Taux</th>
            </tr>
          </thead>
          <tbody>
            {organizations.data.map((organization) => (
              <tr key={organization.id} className="border-t border-slate-200">
                <td>{organization.name}</td>
                <td>{organization.slug}</td>
                <td>{formatPercent(organization.commissionBasisPoints)}</td>
                <td>
                  {organization.status === 'active' ? (
                    'Active'
                  ) : (
                    <>
                      En attente de Keycloak{' '}
                      <button
                        type="button"
                        className="text-indigo-700 underline disabled:opacity-50"
                        disabled={provision.isPending}
                        onClick={() => provision.mutate(organization.id)}
                      >
                        Relancer
                      </button>
                    </>
                  )}
                </td>
                <td>
                  <CommissionRateForm
                    key={organization.commissionBasisPoints}
                    organization={organization}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {provision.error && <StaffProblemNotice problem={provision.error} />}
      </section>
      <OrganizationForm />
      <InviteMemberForm organizations={organizations.data} />
    </>
  );
}
