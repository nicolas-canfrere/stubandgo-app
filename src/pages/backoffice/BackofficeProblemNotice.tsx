import { useAuth } from 'react-oidc-context';
import type { ApiProblem } from '../../api/problem';
import { ProblemNotice } from '../../components/ProblemNotice';
import { ViolationList } from '../../components/ViolationList';

/**
 * What a 403 means in the organization space: on an event route, the event is foreign or unknown;
 * elsewhere, the member is not an administrator of the organization.
 */
const FORBIDDEN = {
  event: "Votre compte n'a pas accès à cet événement.",
  organization: "Votre compte n'est pas administrateur de cette organisation.",
};

/** A problem notice for an organization space call; an expired session offers the sign-in again. */
export function BackofficeProblemNotice({
  problem,
  subject = 'organization',
}: {
  problem: ApiProblem;
  subject?: keyof typeof FORBIDDEN;
}) {
  // Outside /plateforme useAuth is the organizations' realm: the staff sign-in is never touched.
  const { signinRedirect } = useAuth();

  return (
    <div className="flex flex-col gap-2">
      <ProblemNotice
        problem={problem}
        message={problem.code === 'forbidden' ? FORBIDDEN[subject] : undefined}
      />
      <ViolationList violations={problem.violations} />
      {problem.code === 'unauthorized' && (
        <button
          type="button"
          className="self-start text-indigo-700 underline"
          onClick={() => void signinRedirect({ state: '/espace' })}
        >
          Se reconnecter
        </button>
      )}
    </div>
  );
}
