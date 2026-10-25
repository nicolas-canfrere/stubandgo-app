import { describe, expect, it } from 'vitest';
import type { components } from '../api/schema';
import {
  addTier,
  draftFromEvent,
  emptyDraft,
  isoToParisLocal,
  parisLocalToIso,
  removeTier,
  toPayload,
  type EventDraft,
} from './eventDraft';

type BackofficeEvent = components['schemas']['BackofficeEvent'];

const event: BackofficeEvent = {
  id: '01JAE5Z8Q3M4N6P7R8S9T0V1W2',
  title: 'Soirée Rock',
  description: 'Trois groupes.',
  venue: 'La Cigale',
  startsAt: '2026-11-27T19:00:00Z',
  capacity: 200,
  status: 'draft',
  locked: false,
  priceTiers: [
    { id: '01JAE5Z8Q3M4N6P7R8S9T0V2A1', label: 'Plein', priceCents: 2500 },
    { id: '01JAE5Z8Q3M4N6P7R8S9T0V2A2', label: 'Gratuit', priceCents: 0 },
  ],
};

function filled(overrides: Partial<EventDraft> = {}): EventDraft {
  return {
    title: 'Soirée Rock',
    description: 'Trois groupes.',
    venue: 'La Cigale',
    startsAt: '2026-12-01T20:00',
    capacity: '200',
    tiers: [{ key: 'a', id: null, label: 'Plein', price: '12,5' }],
    ...overrides,
  };
}

describe('parisLocalToIso', () => {
  it.each([
    ['2026-07-01T20:00', '2026-07-01T20:00:00+02:00'],
    ['2026-12-01T20:00', '2026-12-01T20:00:00+01:00'],
    // Spring forward on 2026-03-29: 02:00 becomes 03:00.
    ['2026-03-29T01:59', '2026-03-29T01:59:00+01:00'],
    ['2026-03-29T03:00', '2026-03-29T03:00:00+02:00'],
    ['2026-03-28T23:30', '2026-03-28T23:30:00+01:00'],
    // Fall back on 2026-10-25: 03:00 becomes 02:00, so 02:30 happens twice (the first one is kept).
    ['2026-10-25T01:59', '2026-10-25T01:59:00+02:00'],
    ['2026-10-25T02:30', '2026-10-25T02:30:00+02:00'],
    ['2026-10-25T03:00', '2026-10-25T03:00:00+01:00'],
  ])('converts %s to %s', (local, expected) => {
    expect(parisLocalToIso(local)).toBe(expected);
  });

  it.each([
    ['empty', ''],
    ['garbage', 'demain soir'],
    ['a date without time', '2026-12-01'],
    ['an impossible day', '2026-02-30T10:00'],
    ['an impossible hour', '2026-12-01T25:00'],
    ['a time skipped by the spring change', '2026-03-29T02:30'],
  ])('refuses %s', (_name, local) => {
    expect(parisLocalToIso(local)).toBeNull();
  });

  // 2026-10-25T01:00Z to 02:00Z is the second 02:xx, which a local time cannot tell from the first.
  it('is the inverse of the display conversion on both sides of each change', () => {
    for (const instant of [
      '2026-03-29T00:59:00Z',
      '2026-03-29T01:00:00Z',
      '2026-10-25T00:59:00Z',
      '2026-10-25T00:30:00Z',
      '2026-10-25T02:00:00Z',
      '2026-07-14T18:00:00Z',
    ]) {
      const iso = parisLocalToIso(isoToParisLocal(instant));
      expect(iso && new Date(iso).toISOString()).toBe(new Date(instant).toISOString());
    }
  });
});

describe('isoToParisLocal', () => {
  it.each([
    ['2026-11-27T19:00:00Z', '2026-11-27T20:00'],
    ['2026-07-01T18:00:00Z', '2026-07-01T20:00'],
    ['2026-03-28T23:30:00Z', '2026-03-29T00:30'],
    ['2026-03-29T01:00:00Z', '2026-03-29T03:00'],
    ['2026-12-31T23:30:00Z', '2027-01-01T00:30'],
  ])('shows %s as %s', (iso, expected) => {
    expect(isoToParisLocal(iso)).toBe(expected);
  });
});

describe('draft', () => {
  it('starts with one empty tier', () => {
    const draft = emptyDraft();

    expect(draft.tiers).toHaveLength(1);
    expect(draft.tiers[0]).toMatchObject({ id: null, label: '', price: '' });
  });

  it('is filled from an event, tiers keeping their id and price in euros', () => {
    expect(draftFromEvent(event)).toEqual({
      title: 'Soirée Rock',
      description: 'Trois groupes.',
      venue: 'La Cigale',
      startsAt: '2026-11-27T20:00',
      capacity: '200',
      tiers: [
        {
          key: '01JAE5Z8Q3M4N6P7R8S9T0V2A1',
          id: '01JAE5Z8Q3M4N6P7R8S9T0V2A1',
          label: 'Plein',
          price: '25',
        },
        {
          key: '01JAE5Z8Q3M4N6P7R8S9T0V2A2',
          id: '01JAE5Z8Q3M4N6P7R8S9T0V2A2',
          label: 'Gratuit',
          price: '0',
        },
      ],
    });
  });

  it('shows a price with cents using a decimal comma', () => {
    const draft = draftFromEvent({
      ...event,
      priceTiers: [{ id: '01JAE5Z8Q3M4N6P7R8S9T0V2A1', label: 'Plein', priceCents: 1250 }],
    });

    expect(draft.tiers[0]?.price).toBe('12,5');
  });

  it('adds a tier with its own key and removes one by key', () => {
    const added = addTier(filled());
    const keys = added.tiers.map((tier) => tier.key);

    expect(added.tiers).toHaveLength(2);
    expect(new Set(keys).size).toBe(2);
    expect(added.tiers[1]).toMatchObject({ id: null, label: '', price: '' });
    expect(removeTier(added, 'a').tiers.map((tier) => tier.key)).toEqual([keys[1]]);
  });
});

describe('toPayload', () => {
  it('converts the date to Paris time with offset, the price to cents and the capacity to a number', () => {
    expect(toPayload(filled())).toEqual({
      payload: {
        title: 'Soirée Rock',
        description: 'Trois groupes.',
        venue: 'La Cigale',
        startsAt: '2026-12-01T20:00:00+01:00',
        capacity: 200,
        priceTiers: [{ id: null, label: 'Plein', priceCents: 1250 }],
      },
    });
  });

  it('keeps the id of an existing tier and sends a null id for a new one', () => {
    const base = draftFromEvent(event);
    const withNew = toPayload({
      ...base,
      tiers: [...base.tiers, { key: 'new-vip', id: null, label: 'VIP', price: '40' }],
    });

    expect(withNew).toMatchObject({
      payload: {
        priceTiers: [
          { id: '01JAE5Z8Q3M4N6P7R8S9T0V2A1', label: 'Plein', priceCents: 2500 },
          { id: '01JAE5Z8Q3M4N6P7R8S9T0V2A2', label: 'Gratuit', priceCents: 0 },
          { id: null, label: 'VIP', priceCents: 4000 },
        ],
      },
    });
  });

  it('trims the texts', () => {
    const result = toPayload(
      filled({
        title: '  Soirée Rock ',
        venue: ' La Cigale ',
        tiers: [{ key: 'a', id: null, label: ' Plein ', price: '1' }],
      }),
    );

    expect(result).toMatchObject({ payload: { title: 'Soirée Rock', venue: 'La Cigale' } });
    expect(result).toMatchObject({ payload: { priceTiers: [{ label: 'Plein' }] } });
  });

  it.each([
    [
      'a malformed price',
      { tiers: [{ key: 'a', id: null, label: 'Plein', price: '12,345' }] },
      'Prix invalide pour le tarif « Plein »',
    ],
    [
      'a negative price',
      { tiers: [{ key: 'a', id: null, label: 'Plein', price: '-1' }] },
      'Prix invalide pour le tarif « Plein »',
    ],
    ['a fractional capacity', { capacity: '1,5' }, 'Capacité invalide'],
    ['a capacity of zero', { capacity: '0' }, "La capacité doit être d'au moins 1 place"],
    ['a blank title', { title: '   ' }, 'Titre manquant'],
    ['a blank description', { description: ' \t ' }, 'Description manquante'],
    ['a blank venue', { venue: '' }, 'Lieu manquant'],
    [
      'a blank tier label',
      { tiers: [{ key: 'a', id: null, label: '  ', price: '10' }] },
      'Libellé manquant pour le tarif 1',
    ],
    ['no tier at all', { tiers: [] }, 'Ajoutez au moins un tarif'],
    ['an empty capacity', { capacity: '' }, 'Capacité invalide'],
    ['an impossible date', { startsAt: '2026-03-29T02:30' }, 'Date de début invalide'],
  ] as Array<[string, Partial<EventDraft>, string]>)('refuses %s', (_name, overrides, problem) => {
    expect(toPayload(filled(overrides))).toEqual({ problems: [problem] });
  });

  it('reports every problem at once', () => {
    const result = toPayload(filled({ capacity: 'x', startsAt: '' }));

    expect(result).toEqual({ problems: ['Date de début invalide', 'Capacité invalide'] });
  });
});
