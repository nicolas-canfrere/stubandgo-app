import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useOrder } from '../api/queries';
import { OrderEnded } from '../components/OrderEnded';
import { ProblemNotice } from '../components/ProblemNotice';
import { draftForOrder } from '../orders/orderDraft';
import { pageForStatus } from '../orders/orderRoute';
import { NotFoundPage } from './NotFoundPage';

const MAILPIT_URL = 'http://localhost:8025';

export function ConfirmationPage() {
  const { orderId = '' } = useParams();
  const { state } = useLocation();
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

  const page = pageForStatus(order.status);

  if (page === 'payment') {
    return <Navigate to={`/orders/${order.id}/payment`} replace />;
  }

  if (page === 'ended') {
    return (
      <OrderEnded
        code={order.status === 'failed' ? 'payment_declined' : 'order_expired'}
        eventId={order.eventId}
        draft={draftForOrder(state, order.lines)}
      />
    );
  }

  const tickets = order.lines.reduce((sum, line) => sum + (line.quantity ?? 0), 0);

  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-bold">Paiement accepté</h1>
      <p>{tickets > 1 ? `${tickets} billets` : `${tickets} billet`}</p>
      <p>Vos billets vous sont envoyés par email.</p>
      <p>
        <a href={MAILPIT_URL} className="text-indigo-700 hover:underline">
          Ouvrir la boîte mail de démo ({MAILPIT_URL})
        </a>{' '}
        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold">démo</span>
      </p>
    </section>
  );
}
