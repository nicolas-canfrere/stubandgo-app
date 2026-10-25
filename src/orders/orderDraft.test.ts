import { readOrderDraft } from './orderDraft';

describe('readOrderDraft', () => {
  it('accepts a well-formed draft', () => {
    const draft = { buyerEmail: 'a@b.fr', quantities: { t1: 2, t2: 0 } };

    expect(readOrderDraft(draft)).toEqual(draft);
  });

  it.each([
    ['null', null],
    ['a string', 'x'],
    ['no email', { quantities: {} }],
    ['no quantities', { buyerEmail: 'a@b.fr' }],
    ['null quantities', { buyerEmail: 'a@b.fr', quantities: null }],
    ['a negative quantity', { buyerEmail: 'a@b.fr', quantities: { t1: -1 } }],
    ['a fractional quantity', { buyerEmail: 'a@b.fr', quantities: { t1: 1.5 } }],
    ['a non-numeric quantity', { buyerEmail: 'a@b.fr', quantities: { t1: '2' } }],
  ])('ignores %s', (_label, state) => {
    expect(readOrderDraft(state)).toBeNull();
  });
});
