import { useLocation, useParams } from 'react-router-dom';
import { isNotFound } from '../api/problem';
import { useAvailability, useEvent } from '../api/queries';
import { OrderForm } from '../components/OrderForm';
import { ProblemNotice } from '../components/ProblemNotice';
import { formatDateTime } from '../format';
import type { components } from '../api/schema';
import { type OrderDraft, readOrderDraft } from '../orders/orderDraft';
import { NotFoundPage } from './NotFoundPage';

type EventDetail = components['schemas']['EventDetail'];

function remainingLabel(remaining: number): string {
  return remaining > 1 ? `${remaining} places restantes` : `${remaining} place restante`;
}

export function EventPage() {
  const { eventId = '' } = useParams();
  const { state } = useLocation();
  const { data: event, error, isPending } = useEvent(eventId);

  if (isNotFound(error)) {
    return <NotFoundPage />;
  }

  if (error) {
    return <ProblemNotice problem={error} />;
  }

  if (isPending) {
    return <p className="text-slate-600">Chargement…</p>;
  }

  return <EventDetails event={event} draft={readOrderDraft(state)} />;
}

function EventDetails({ event, draft }: { event: EventDetail; draft: OrderDraft | null }) {
  const availability = useAvailability(event.id);

  return (
    <section>
      <h1 className="text-2xl font-bold">{event.title}</h1>
      <p className="mt-1 text-slate-600">{formatDateTime(event.startsAt)}</p>
      <p className="text-slate-600">{event.venue}</p>
      <p className="mt-3">{event.description}</p>
      {availability.data && (
        <p className="mt-3 font-medium">{remainingLabel(availability.data.remaining)}</p>
      )}
      <OrderForm eventId={event.id} priceTiers={event.priceTiers} draft={draft} />
    </section>
  );
}
