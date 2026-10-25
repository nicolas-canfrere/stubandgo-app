import { type OrderLine, useEvent } from '../api/queries';
import { formatEuros } from '../format';

/** Order lines with tier labels from the event; without them (event call failed) lines stay unlabelled. */
export function OrderSummary({
  eventId,
  lines,
  totalCents,
}: {
  eventId: string;
  lines: OrderLine[];
  totalCents: number;
}) {
  const { data: event } = useEvent(eventId);
  const labelOf = (id?: string) => event?.priceTiers.find((tier) => tier.id === id)?.label;

  return (
    <div>
      <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {lines.map((line, index) => {
          const quantity = line.quantity ?? 0;
          const label = labelOf(line.priceTierId);

          return (
            <li key={line.priceTierId ?? index} className="p-3">
              {label ? `${label} × ${quantity}` : `× ${quantity}`} —{' '}
              {formatEuros(quantity * (line.unitPriceCents ?? 0))}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-lg font-semibold">Total : {formatEuros(totalCents)}</p>
    </div>
  );
}
