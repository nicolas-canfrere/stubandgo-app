import type { components } from '../api/schema';
import { parseEuros } from '../money';

type BackofficeEvent = components['schemas']['BackofficeEvent'];
type EventRequest = components['schemas']['EventRequest'];

/** A price tier as typed: the price stays text until it is converted to cents. */
export type TierDraft = {
  /** Stable key for the list; the tier id for an existing tier. */
  key: string;
  /** The API identifier of an existing tier; null for a tier added in the form. */
  id: string | null;
  label: string;
  price: string;
};

/** The event form state: every field as typed. */
export type EventDraft = {
  title: string;
  description: string;
  venue: string;
  /** A datetime-local value (YYYY-MM-DDTHH:mm), read as Europe/Paris time. */
  startsAt: string;
  capacity: string;
  tiers: TierDraft[];
};

/** The body sent to the API: an existing tier keeps its id, a new one has none. */
export type EventPayload = Omit<EventRequest, 'priceTiers'> & {
  priceTiers: Array<{ id?: string; label: string; priceCents: number }>;
};

export type PayloadResult = { payload: EventPayload } | { problems: string[] };

let tierCounter = 0;

function newTier(): TierDraft {
  tierCounter += 1;

  return { key: `new-${tierCounter}`, id: null, label: '', price: '' };
}

export function emptyDraft(): EventDraft {
  return { title: '', description: '', venue: '', startsAt: '', capacity: '', tiers: [newTier()] };
}

export function addTier(draft: EventDraft): EventDraft {
  return { ...draft, tiers: [...draft.tiers, newTier()] };
}

export function removeTier(draft: EventDraft, key: string): EventDraft {
  return { ...draft, tiers: draft.tiers.filter((tier) => tier.key !== key) };
}

/** Cents as typed in a price field: euros with a decimal comma and no useless zeros. */
function priceInput(cents: number): string {
  return String(cents / 100).replace('.', ',');
}

export function draftFromEvent(event: BackofficeEvent): EventDraft {
  return {
    title: event.title,
    description: event.description,
    venue: event.venue,
    startsAt: isoToParisLocal(event.startsAt),
    capacity: String(event.capacity),
    tiers: event.priceTiers.map((tier) => ({
      key: tier.id,
      id: tier.id,
      label: tier.label,
      price: priceInput(tier.priceCents),
    })),
  };
}

const parisParts = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

type Wall = { year: number; month: number; day: number; hour: number; minute: number };

/** The Paris wall clock at an instant. */
function parisWall(instant: number): Wall {
  const wall: Wall = { year: 0, month: 0, day: 0, hour: 0, minute: 0 };
  for (const part of parisParts.formatToParts(new Date(instant))) {
    if (part.type in wall) {
      wall[part.type as keyof Wall] = Number(part.value);
    }
  }

  return wall;
}

const pad = (value: number) => String(value).padStart(2, '0');

/** Formats an instant's Paris wall clock as a datetime-local value. */
export function isoToParisLocal(iso: string): string {
  const wall = parisWall(new Date(iso).getTime());

  return `${wall.year}-${pad(wall.month)}-${pad(wall.day)}T${pad(wall.hour)}:${pad(wall.minute)}`;
}

/** The wall clock read as if it were UTC: the difference to the instant is the Paris offset. */
function wallAsUtc(instant: number): number {
  const wall = parisWall(instant);

  return Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute);
}

const LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? '-' : '+';

  return `${sign}${pad(Math.floor(Math.abs(minutes) / 60))}:${pad(Math.abs(minutes) % 60)}`;
}

const DAY = 86_400_000;

/**
 * Reads a datetime-local value as Europe/Paris time and returns an ISO 8601 date-time with its
 * UTC offset; null when it is malformed, impossible, or skipped by the spring clock change.
 * A time that happens twice (autumn change) takes the first occurrence.
 */
export function parisLocalToIso(local: string): string | null {
  const match = LOCAL.exec(local);
  if (match === null) {
    return null;
  }
  const [year, month, day, hour, minute] = match.slice(1).map(Number) as [
    number,
    number,
    number,
    number,
    number,
  ];
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  // Clock changes are months apart: the offsets a day before and a day after hold the candidates.
  const offsets = new Set([
    wallAsUtc(wall - DAY) - (wall - DAY),
    wallAsUtc(wall + DAY) - (wall + DAY),
  ]);
  const instants = [...offsets]
    .map((offset) => wall - offset)
    .filter((instant) => isoToParisLocal(new Date(instant).toISOString()) === local)
    .sort((a, b) => a - b);
  const first = instants[0];
  if (first === undefined) {
    return null;
  }

  return `${local}:00${formatOffset((wall - first) / 60_000)}`;
}

/** Converts the form state into the API body, or lists what cannot be converted. */
export function toPayload(draft: EventDraft): PayloadResult {
  const problems: string[] = [];
  const startsAt = parisLocalToIso(draft.startsAt);
  if (startsAt === null) {
    problems.push('Date de début invalide');
  }
  const capacity = /^\d+$/.test(draft.capacity.trim()) ? Number(draft.capacity.trim()) : NaN;
  if (!Number.isSafeInteger(capacity)) {
    problems.push('Capacité invalide');
  }
  const priceTiers: EventPayload['priceTiers'] = [];
  for (const tier of draft.tiers) {
    const label = tier.label.trim();
    const priceCents = parseEuros(tier.price);
    if (priceCents === null) {
      problems.push(`Prix invalide pour le tarif « ${label} »`);
    } else {
      priceTiers.push(
        tier.id === null ? { label, priceCents } : { id: tier.id, label, priceCents },
      );
    }
  }
  if (problems.length > 0 || startsAt === null) {
    return { problems };
  }

  return {
    payload: {
      title: draft.title.trim(),
      description: draft.description.trim(),
      venue: draft.venue.trim(),
      startsAt,
      capacity,
      priceTiers,
    },
  };
}
