import { useRef, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useOrder, usePayOrder } from '../api/queries';
import { Countdown } from '../components/Countdown';
import { OrderEnded } from '../components/OrderEnded';
import { OrderSummary } from '../components/OrderSummary';
import { ProblemNotice } from '../components/ProblemNotice';
import { draftForOrder } from '../orders/orderDraft';
import { pageForStatus } from '../orders/orderRoute';
import { useRemainingSeconds } from '../orders/useRemainingSeconds';
import { NotFoundPage } from './NotFoundPage';

type OrderView = NonNullable<ReturnType<typeof useOrder>['data']>;

export function PaymentPage() {
  const { orderId = '' } = useParams();
  const { data: order, error, isPending } = useOrder(orderId);

  if (error?.status === 404 || error?.code === 'invalid_value') {
    return <NotFoundPage />;
  }

  if (error) {
    return <ProblemNotice problem={error} />;
  }

  if (isPending) {
    return <p className="text-slate-600">Chargement…</p>;
  }

  return <Payment order={order} />;
}

function Payment({ order }: { order: OrderView }) {
  const { state } = useLocation();
  const navigate = useNavigate();
  const pay = usePayOrder(order.id, order.eventId);
  const paying = useRef(false);
  const [cardNumber, setCardNumber] = useState('');
  const remaining = useRemainingSeconds(order.expiresAt);
  const draft = draftForOrder(state, order.lines);

  const page = pageForStatus(order.status);
  const endedCode =
    pay.error?.code === 'payment_declined' || pay.error?.code === 'order_expired'
      ? pay.error.code
      : null;

  if (endedCode !== null) {
    return <OrderEnded code={endedCode} eventId={order.eventId} draft={draft} />;
  }

  if (page === 'confirmation') {
    return <Navigate to={`/orders/${order.id}`} replace />;
  }

  if (page === 'ended') {
    return (
      <OrderEnded
        code={order.status === 'failed' ? 'payment_declined' : 'order_expired'}
        eventId={order.eventId}
        draft={draft}
      />
    );
  }

  const expired = remaining === 0;
  const canPay = !expired && !pay.isPending && cardNumber.replace(/\s/g, '') !== '';

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canPay || paying.current) {
      return;
    }
    paying.current = true;

    pay.mutate(cardNumber.replace(/\s/g, ''), {
      onSuccess: () => navigate(`/orders/${order.id}`),
      onSettled: () => {
        paying.current = false;
      },
    });
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">Paiement</h1>
      <OrderSummary eventId={order.eventId} lines={order.lines} totalCents={order.totalCents} />
      {order.expiresAt !== null && <Countdown expiresAt={order.expiresAt} />}
      {expired && (
        <button
          type="button"
          onClick={() => navigate(`/events/${order.eventId}`, { state: draft })}
          className="rounded border border-indigo-700 px-4 py-2 font-semibold text-indigo-700"
        >
          Recommencer
        </button>
      )}
      <aside className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm">
        <p className="font-semibold">Paiement simulé — cartes de test</p>
        <ul className="mt-1 list-disc pl-5">
          <li>
            <code>4242 4242 4242 4242</code> : paiement accepté
          </li>
          <li>
            <code>4000 0000 0000 0002</code> : paiement refusé
          </li>
        </ul>
      </aside>
      <form onSubmit={submit} noValidate className="space-y-4">
        {pay.error && <ProblemNotice problem={pay.error} />}
        <div>
          <label htmlFor="card-number" className="block text-sm font-medium">
            Numéro de carte
          </label>
          <input
            id="card-number"
            inputMode="numeric"
            autoComplete="off"
            value={cardNumber}
            onChange={(event) => setCardNumber(event.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </div>
        <button
          type="submit"
          disabled={!canPay}
          className="rounded bg-indigo-700 px-4 py-2 font-semibold text-white disabled:opacity-40"
        >
          Payer
        </button>
      </form>
    </section>
  );
}
