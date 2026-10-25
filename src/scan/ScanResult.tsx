import type { ScanOutcome } from '../api/queries';
import { formatDateTime } from '../format';

const TONES: Record<ScanOutcome, string> = {
  valid: 'bg-green-700',
  already_used: 'bg-red-700',
  wrong_event: 'bg-orange-500',
  unknown: 'bg-red-700',
};

function label(outcome: ScanOutcome, firstUsedAt: string | null): string {
  switch (outcome) {
    case 'valid':
      return 'VALIDE — entrée autorisée';
    case 'already_used':
      return firstUsedAt === null
        ? 'DÉJÀ UTILISÉ'
        : `DÉJÀ UTILISÉ — le ${formatDateTime(firstUsedAt)}`;
    case 'wrong_event':
      return 'MAUVAIS ÉVÉNEMENT';
    case 'unknown':
      return 'BILLET INCONNU';
  }
}

export function ScanResult({
  outcome,
  firstUsedAt,
}: {
  outcome: ScanOutcome;
  firstUsedAt: string | null;
}) {
  return (
    <p
      role="status"
      className={`${TONES[outcome]} rounded-md p-6 text-center text-2xl font-bold text-white`}
    >
      {label(outcome, firstUsedAt)}
    </p>
  );
}
