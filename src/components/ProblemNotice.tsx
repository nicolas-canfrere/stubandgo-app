import { problemMessage } from '../api/messages';
import { type ApiProblem, UNREACHABLE_CODE } from '../api/problem';

/** A problem alert; `message` replaces the generic translation when a screen knows better. */
export function ProblemNotice({ problem, message }: { problem: ApiProblem; message?: string }) {
  return (
    <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-red-900">
      {problem.code === UNREACHABLE_CODE && <h2 className="font-semibold">API injoignable</h2>}
      <p>{message ?? problemMessage(problem)}</p>
    </div>
  );
}
