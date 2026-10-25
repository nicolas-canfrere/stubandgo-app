import { useUpcomingEvents } from '../api/queries';
import { EventGrid } from '../components/EventGrid';
import { ProblemNotice } from '../components/ProblemNotice';

export function HomePage() {
  const { data, error, isPending } = useUpcomingEvents();

  return (
    <section>
      <h1 className="mb-4 text-2xl font-bold">Événements à venir</h1>
      {error ? (
        <ProblemNotice problem={error} />
      ) : isPending ? (
        <p className="text-slate-600">Chargement…</p>
      ) : (
        <EventGrid events={data} />
      )}
    </section>
  );
}
