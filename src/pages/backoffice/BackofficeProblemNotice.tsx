import { useAuth } from 'react-oidc-context';
import type { ApiProblem } from '../../api/problem';
import { ProblemNotice } from '../../components/ProblemNotice';

/** In the organization space the API refuses a foreign or unknown event with 403. */
const FORBIDDEN = "Votre compte n'a pas accès à cet événement.";

/** A problem notice for an organization space call; an expired session offers the sign-in again. */
export function BackofficeProblemNotice({ problem }: { problem: ApiProblem }) {
  // Outside /plateforme useAuth is the organizations' realm: the staff sign-in is never touched.
  const { signinRedirect } = useAuth();

  return (
    <div className="flex flex-col gap-2">
      <ProblemNotice
        problem={problem}
        message={problem.code === 'forbidden' ? FORBIDDEN : undefined}
      />
      {problem.violations.length > 0 && (
        <ul className="list-disc pl-6 text-red-900">
          {problem.violations.map((violation) => (
            <li key={`${violation.propertyPath}:${violation.message}`}>
              {violation.propertyPath} : {violation.message}
            </li>
          ))}
        </ul>
      )}
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
