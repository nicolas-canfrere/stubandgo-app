import { useAuth } from 'react-oidc-context';
import type { ApiProblem } from '../../api/problem';
import { ProblemNotice } from '../../components/ProblemNotice';

/** A problem notice for a platform call; an expired staff session offers the STAFF sign-in again. */
export function StaffProblemNotice({ problem }: { problem: ApiProblem }) {
  // Inside the platform space useAuth is the staff realm: the organization sign-in is never touched.
  const { signinRedirect } = useAuth();

  return (
    <div className="flex flex-col gap-2">
      <ProblemNotice problem={problem} />
      {problem.code === 'unauthorized' && (
        <button
          type="button"
          className="self-start text-indigo-700 underline"
          onClick={() => void signinRedirect({ state: '/plateforme' })}
        >
          Se reconnecter
        </button>
      )}
    </div>
  );
}
