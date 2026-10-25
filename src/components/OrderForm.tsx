import { useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlaceOrder } from '../api/queries';
import type { components } from '../api/schema';
import { formatEuros } from '../format';
import type { OrderDraft } from '../orders/orderDraft';
import { ProblemNotice } from './ProblemNotice';

type PriceTier = components['schemas']['PriceTier'];

const MAX_TICKETS = 10;
const EMAIL_FIELD = 'buyerEmail';

export function OrderForm({
  eventId,
  priceTiers,
  draft,
}: {
  eventId: string;
  priceTiers: PriceTier[];
  draft: OrderDraft | null;
}) {
  const navigate = useNavigate();
  const placeOrder = usePlaceOrder();
  const submitting = useRef(false);
  const [buyerEmail, setBuyerEmail] = useState(draft?.buyerEmail ?? '');
  const [quantities, setQuantities] = useState<Record<string, number>>(draft?.quantities ?? {});

  const quantityOf = (tier: PriceTier) => quantities[tier.id] ?? 0;
  const ticketCount = priceTiers.reduce((sum, tier) => sum + quantityOf(tier), 0);
  const totalCents = priceTiers.reduce((sum, tier) => sum + quantityOf(tier) * tier.priceCents, 0);
  const canSubmit = ticketCount >= 1 && ticketCount <= MAX_TICKETS && !placeOrder.isPending;

  const change = (tier: PriceTier, delta: number) =>
    setQuantities((current) => ({
      ...current,
      [tier.id]: Math.max(0, (current[tier.id] ?? 0) + delta),
    }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit || submitting.current) {
      return;
    }
    submitting.current = true;

    const lines = priceTiers
      .filter((tier) => quantityOf(tier) > 0)
      .map((tier) => ({ priceTierId: tier.id, quantity: quantityOf(tier) }));
    const submitted: OrderDraft = { buyerEmail, quantities };

    placeOrder.mutate(
      { eventId, buyerEmail, lines },
      {
        onSuccess: (order) =>
          order.status === 'paid'
            ? navigate(`/orders/${order.id}`)
            : navigate(`/orders/${order.id}/payment`, { state: submitted }),
        onSettled: () => {
          submitting.current = false;
        },
      },
    );
  };

  const error = placeOrder.error;
  const emailViolation = error?.violations.find(
    (violation) => violation.propertyPath === EMAIL_FIELD,
  );

  return (
    <form onSubmit={submit} noValidate className="mt-6 space-y-4">
      {error && !emailViolation && <ProblemNotice problem={error} />}
      <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {priceTiers.map((tier) => (
          <li key={tier.id} className="flex items-center justify-between gap-4 p-3">
            <span className="font-medium">{tier.label}</span>
            <span className="text-slate-600">{formatEuros(tier.priceCents)}</span>
            <span className="flex items-center gap-2">
              <button
                type="button"
                aria-label={`Retirer un billet ${tier.label}`}
                disabled={quantityOf(tier) === 0}
                onClick={() => change(tier, -1)}
                className="h-8 w-8 rounded border border-slate-300 disabled:opacity-40"
              >
                −
              </button>
              <output aria-label={`Quantité ${tier.label}`} className="w-6 text-center">
                {quantityOf(tier)}
              </output>
              <button
                type="button"
                aria-label={`Ajouter un billet ${tier.label}`}
                onClick={() => change(tier, 1)}
                className="h-8 w-8 rounded border border-slate-300"
              >
                +
              </button>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-sm text-slate-600">
        Au moins un billet, {MAX_TICKETS} billets maximum par commande.
      </p>
      <p className="text-lg font-semibold">Total : {formatEuros(totalCents)}</p>
      <div>
        <label htmlFor="buyer-email" className="block text-sm font-medium">
          Email
        </label>
        <p id="buyer-email-hint" className="text-sm text-slate-600">
          Une adresse email valide est requise.
        </p>
        <input
          id="buyer-email"
          type="email"
          value={buyerEmail}
          onChange={(event) => setBuyerEmail(event.target.value)}
          aria-invalid={emailViolation ? true : undefined}
          aria-describedby={
            emailViolation ? 'buyer-email-hint buyer-email-error' : 'buyer-email-hint'
          }
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
        />
        {emailViolation && (
          <p id="buyer-email-error" className="mt-1 text-sm text-red-700">
            Saisissez une adresse email valide.
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={!canSubmit}
        className="rounded bg-indigo-700 px-4 py-2 font-semibold text-white disabled:opacity-40"
      >
        Réserver et payer
      </button>
    </form>
  );
}
