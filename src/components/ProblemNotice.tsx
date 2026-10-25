import { problemMessage } from '../api/messages';
import { type ApiProblem, UNREACHABLE_CODE } from '../api/problem';

export function ProblemNotice({ problem }: { problem: ApiProblem }) {
  return (
    <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-red-900">
      {problem.code === UNREACHABLE_CODE && <h2 className="font-semibold">API injoignable</h2>}
      <p>{problemMessage(problem)}</p>
    </div>
  );
}
