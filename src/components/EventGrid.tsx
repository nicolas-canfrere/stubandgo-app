import { Link } from 'react-router-dom';
import type { components } from '../api/schema';
import { formatDateTime } from '../format';

type EventSummary = components['schemas']['EventSummary'];

export function EventGrid({ events }: { events: EventSummary[] }) {
  if (events.length === 0) {
    return <p className="text-slate-600">Aucun événement à venir.</p>;
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <li key={event.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold">
            <Link to={`/events/${event.id}`} className="text-indigo-700 hover:underline">
              {event.title}
            </Link>
          </h3>
          <p className="mt-1 text-sm text-slate-600">{formatDateTime(event.startsAt)}</p>
          <p className="text-sm text-slate-600">{event.venue}</p>
          <p className="mt-2 text-sm">
            <Link to={`/o/${event.organization.slug}`} className="text-slate-500 hover:underline">
              {event.organization.name}
            </Link>
          </p>
        </li>
      ))}
    </ul>
  );
}
