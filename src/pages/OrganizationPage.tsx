import { useParams } from 'react-router-dom';
import { useOrganization } from '../api/queries';
import { EventGrid } from '../components/EventGrid';
import { ProblemNotice } from '../components/ProblemNotice';
import { NotFoundPage } from './NotFoundPage';

export function OrganizationPage() {
  const { slug = '' } = useParams();
  const { data, error, isPending } = useOrganization(slug);

  if (error?.status === 404) {
    return <NotFoundPage />;
  }

  return (
    <section>
      {error ? (
        <ProblemNotice problem={error} />
      ) : isPending ? (
        <p className="text-slate-600">Chargement…</p>
      ) : (
        <>
          <h1 className="mb-4 text-2xl font-bold">{data.name}</h1>
          <EventGrid events={data.events} />
        </>
      )}
    </section>
  );
}
