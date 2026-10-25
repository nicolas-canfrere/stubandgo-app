import { useRemainingSeconds } from '../orders/useRemainingSeconds';

const pad = (value: number) => String(value).padStart(2, '0');

export function Countdown({ expiresAt }: { expiresAt: string }) {
  const remaining = useRemainingSeconds(expiresAt) ?? 0;

  if (remaining === 0) {
    return <p className="font-semibold text-red-700">Réservation expirée</p>;
  }

  return (
    <p>
      Temps restant pour payer :{' '}
      <span className="font-mono font-semibold">
        {pad(Math.floor(remaining / 60))}:{pad(remaining % 60)}
      </span>
    </p>
  );
}
