import { Link } from 'react-router-dom';
import { useBackofficeEvents } from '../../api/backofficeQueries';
import { formatDateTime } from '../../format';
import { BackofficeProblemNotice } from './BackofficeProblemNotice';

export function EventListPage() {
  const events = useBackofficeEvents();

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Événements</h1>
        <Link to="/espace/events/new" className="rounded-md bg-indigo-700 px-3 py-1.5 text-white">
          Nouvel événement
        </Link>
      </div>
      {events.isPending && <p className="text-slate-600">Chargement…</p>}
      {events.isError && <BackofficeProblemNotice problem={events.error} />}
      {events.isSuccess && events.data.length === 0 && (
        <p className="text-slate-600">Aucun événement pour l'instant.</p>
      )}
      {events.isSuccess && events.data.length > 0 && (
        <table className="w-full text-left">
          <thead>
            <tr>
              <th>Titre</th>
              <th>Début</th>
              <th>Statut</th>
              <th>Places</th>
              <th>Ventes</th>
            </tr>
          </thead>
          <tbody>
            {events.data.map((event) => (
              <tr key={event.id} className="border-t border-slate-200">
                <td>
                  <Link to={`/espace/events/${event.id}`} className="text-indigo-700 underline">
                    {event.title}
                  </Link>
                </td>
                <td>{formatDateTime(event.startsAt)}</td>
                <td>{event.status === 'published' ? 'Publié' : 'Brouillon'}</td>
                <td>{event.locked ? 'Verrouillé' : ''}</td>
                <td>
                  <Link
                    to={`/espace/events/${event.id}/sales`}
                    className="text-indigo-700 underline"
                  >
                    Ventes
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
