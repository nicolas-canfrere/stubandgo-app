import type { Violation } from '../api/problem';

/** The fields the API refused in a malformed payload (validation_failed), one per line. */
export function ViolationList({ violations }: { violations: Violation[] }) {
  if (violations.length === 0) {
    return null;
  }

  return (
    <ul className="list-disc pl-6 text-red-900">
      {violations.map((violation) => (
        <li key={`${violation.propertyPath}:${violation.message}`}>
          {violation.propertyPath} : {violation.message}
        </li>
      ))}
    </ul>
  );
}
