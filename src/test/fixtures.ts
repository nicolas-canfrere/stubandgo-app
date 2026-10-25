import type { components } from '../api/schema';

type EventSummary = components['schemas']['EventSummary'];

// Mirrors the API demo data (app:demo:load); dates are fixed UTC instants.
export const rockEvent: EventSummary = {
  id: '01JAE5Z8Q3M4N6P7R8S9T0V1W2',
  title: 'Soirée Rock',
  venue: 'La Cigale',
  startsAt: '2026-11-25T19:00:00Z',
  organization: { slug: 'demo-rock-asso', name: 'Rock Asso' },
};

export const intimateEvent: EventSummary = {
  id: '01JAE5Z8Q3M4N6P7R8S9T0V1W3',
  title: 'Concert Intimiste',
  venue: 'Le Petit Bain',
  startsAt: '2026-12-09T19:00:00Z',
  organization: { slug: 'demo-rock-asso', name: 'Rock Asso' },
};

export const theatreEvent: EventSummary = {
  id: '01JAE5Z8Q3M4N6P7R8S9T0V1W4',
  title: 'Le Malade imaginaire',
  venue: 'Salle Molière',
  startsAt: '2026-12-24T19:00:00Z',
  organization: { slug: 'demo-theatre-ville', name: 'Théâtre de la Ville' },
};

export const problemBody = (code: string, status: number, detail: string) => ({
  type: `/problems/${code}`,
  title: code,
  status,
  detail,
});
