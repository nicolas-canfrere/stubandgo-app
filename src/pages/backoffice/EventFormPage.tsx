import { useState, type FormEvent } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  useBackofficeEvent,
  useCreateEvent,
  usePublishEvent,
  useReviseEvent,
  useUnpublishEvent,
  type BackofficeEvent,
} from '../../api/backofficeQueries';
import { codeMessage } from '../../api/messages';
import {
  addTier,
  draftFromEvent,
  emptyDraft,
  removeTier,
  toPayload,
  type EventDraft,
} from '../../backoffice/eventDraft';
import { BackofficeProblemNotice } from './BackofficeProblemNotice';

const inputClass = 'rounded-md border border-slate-300 px-2 py-1';
const buttonClass = 'rounded-md bg-indigo-700 px-3 py-1.5 text-white disabled:opacity-50';

/** Creation (`/espace/events/new`) or detail and revision (`/espace/events/:eventId`) of an event. */
export function EventFormPage() {
  const { eventId } = useParams();

  return eventId === undefined ? <EventForm event={null} /> : <EventDetail eventId={eventId} />;
}

function EventDetail({ eventId }: { eventId: string }) {
  const event = useBackofficeEvent(eventId);

  if (event.isPending) {
    return <p className="text-slate-600">Chargement…</p>;
  }
  if (event.isError) {
    return <BackofficeProblemNotice problem={event.error} subject="event" />;
  }

  // Keyed by content: a saved, published or unpublished event resets the form to the API state.
  return <EventForm key={JSON.stringify(event.data)} event={event.data} />;
}

/** Why the form cannot be edited, or null when it can. */
function readOnlyReason(event: BackofficeEvent | null): string | null {
  if (event === null) {
    return null;
  }
  if (event.locked) {
    return codeMessage('event_locked');
  }

  return event.status === 'published' ? codeMessage('event_not_draft') : null;
}

function EventForm({ event }: { event: BackofficeEvent | null }) {
  const eventId = event?.id ?? '';
  const create = useCreateEvent();
  const revise = useReviseEvent(eventId);
  const publish = usePublishEvent(eventId);
  const unpublish = useUnpublishEvent(eventId);
  const [draft, setDraft] = useState<EventDraft>(event ? draftFromEvent(event) : emptyDraft());
  const [problems, setProblems] = useState<string[]>([]);
  const reason = readOnlyReason(event);
  const save = event === null ? create : revise;

  if (create.isSuccess) {
    return <Navigate to={`/espace/events/${create.data.id}`} replace />;
  }

  const submit = (submitted: FormEvent) => {
    submitted.preventDefault();
    const result = toPayload(draft);
    setProblems('problems' in result ? result.problems : []);
    if ('payload' in result) {
      save.mutate(result.payload);
    }
  };
  const change = (patch: Partial<EventDraft>) => setDraft({ ...draft, ...patch });
  const textField = (label: string, field: 'title' | 'description' | 'venue' | 'capacity') => (
    <label className="flex flex-col gap-1">
      {label}
      <input
        className={inputClass}
        value={draft[field]}
        onChange={(e) => change({ [field]: e.target.value })}
        required
      />
    </label>
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{event === null ? 'Nouvel événement' : event.title}</h1>
      {reason !== null && (
        <p
          role="status"
          className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900"
        >
          {reason}
        </p>
      )}
      <fieldset disabled={reason !== null} className="flex flex-col gap-3">
        {textField('Titre', 'title')}
        {textField('Description', 'description')}
        {textField('Lieu', 'venue')}
        <label className="flex flex-col gap-1">
          Début (heure de Paris)
          <input
            type="datetime-local"
            className={inputClass}
            value={draft.startsAt}
            onChange={(e) => change({ startsAt: e.target.value })}
            required
          />
        </label>
        {textField('Capacité', 'capacity')}
        <h2 className="text-lg font-semibold">Tarifs</h2>
        {draft.tiers.map((tier, index) => (
          <div key={tier.key} className="flex items-end gap-2">
            <label className="flex flex-col gap-1">
              {`Libellé du tarif ${index + 1}`}
              <input
                className={inputClass}
                value={tier.label}
                onChange={(e) =>
                  change({
                    tiers: draft.tiers.map((t) =>
                      t.key === tier.key ? { ...t, label: e.target.value } : t,
                    ),
                  })
                }
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              {`Prix du tarif ${index + 1} (€)`}
              <input
                className={`w-28 ${inputClass}`}
                inputMode="decimal"
                value={tier.price}
                onChange={(e) =>
                  change({
                    tiers: draft.tiers.map((t) =>
                      t.key === tier.key ? { ...t, price: e.target.value } : t,
                    ),
                  })
                }
                required
              />
            </label>
            {reason === null && (
              <button
                type="button"
                className="text-indigo-700 underline"
                onClick={() => setDraft(removeTier(draft, tier.key))}
              >
                {`Retirer le tarif ${index + 1}`}
              </button>
            )}
          </div>
        ))}
        {reason === null && (
          <button
            type="button"
            className="self-start text-indigo-700 underline"
            onClick={() => setDraft(addTier(draft))}
          >
            Ajouter un tarif
          </button>
        )}
      </fieldset>
      {problems.length > 0 && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-red-900">
          {problems.map((problem) => (
            <p key={problem}>{problem}</p>
          ))}
        </div>
      )}
      {[save, publish, unpublish].map(
        (mutation, index) =>
          mutation.error && (
            <BackofficeProblemNotice
              key={index}
              problem={mutation.error}
              subject={event === null ? 'organization' : 'event'}
            />
          ),
      )}
      <div className="flex items-center gap-4">
        {reason === null && (
          <button type="submit" disabled={save.isPending} className={buttonClass}>
            {event === null ? 'Créer' : 'Enregistrer'}
          </button>
        )}
        {event?.status === 'draft' && (
          <button
            type="button"
            disabled={publish.isPending}
            className={buttonClass}
            onClick={() => publish.mutate()}
          >
            Publier
          </button>
        )}
        {event?.status === 'published' && !event.locked && (
          <button
            type="button"
            disabled={unpublish.isPending}
            className={buttonClass}
            onClick={() => unpublish.mutate()}
          >
            Dépublier
          </button>
        )}
        {event !== null && (
          <Link to={`/espace/events/${event.id}/sales`} className="text-indigo-700 underline">
            Voir les ventes
          </Link>
        )}
      </div>
    </form>
  );
}
