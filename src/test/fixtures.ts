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

type EventDetail = components['schemas']['EventDetail'];

export const pleinTierId = '01JAE5Z8Q3M4N6P7R8S9T0V2A1';
export const reduitTierId = '01JAE5Z8Q3M4N6P7R8S9T0V2A2';
export const gratuitTierId = '01JAE5Z8Q3M4N6P7R8S9T0V2A3';

export const rockEventDetail: EventDetail = {
  id: rockEvent.id,
  title: 'Soirée Rock',
  description: 'Une soirée rock à La Cigale.',
  venue: 'La Cigale',
  startsAt: rockEvent.startsAt,
  capacity: 200,
  organization: rockEvent.organization,
  priceTiers: [
    { id: pleinTierId, label: 'Plein', priceCents: 2500 },
    { id: reduitTierId, label: 'Réduit', priceCents: 1500 },
    { id: gratuitTierId, label: 'Gratuit', priceCents: 0 },
  ],
};
