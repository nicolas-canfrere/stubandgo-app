import { useNavigate } from 'react-router-dom';
import { problemMessage } from '../api/messages';
import { ApiProblem } from '../api/problem';
import type { OrderDraft } from '../orders/orderDraft';

/** An order that can no longer be paid: why, and a way back to the event with the same choices. */
export function OrderEnded({
  code,
  eventId,
  draft,
}: {
  code: 'payment_declined' | 'order_expired';
  eventId: string;
  draft: OrderDraft;
}) {
  const navigate = useNavigate();
  const message = problemMessage(new ApiProblem({ code, status: 0, detail: '' }));

  return (
    <section className="space-y-4">
      <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-red-900">
        <p>{message}</p>
      </div>
      <button
        type="button"
        onClick={() => navigate(`/events/${eventId}`, { state: draft })}
        className="rounded bg-indigo-700 px-4 py-2 font-semibold text-white"
      >
        Recommencer
      </button>
    </section>
  );
}
