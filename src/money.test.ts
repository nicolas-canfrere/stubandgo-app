import { formatPercent, parseEuros, parsePercent } from './money';

describe('parseEuros', () => {
  it.each([
    ['12', 1200],
    ['12,5', 1250],
    ['12.50', 1250],
    ['0,05', 5],
    ['0', 0],
    [' 25 ', 2500],
    ['19,99', 1999],
  ])('reads %j as %d cents', (input, cents) => {
    expect(parseEuros(input)).toBe(cents);
  });

  it.each([
    '12,555',
    '9007199254740991',
    '99999999999999999999',
    '-5',
    '',
    ' ',
    'abc',
    '12,',
    ',5',
    '1e3',
    '12 €',
    '1,2,3',
  ])('rejects %j', (input) => {
    expect(parseEuros(input)).toBeNull();
  });
});

describe('parsePercent', () => {
  it.each([
    ['3', 300],
    ['2,75', 275],
    ['2.75', 275],
    ['0', 0],
    ['0,01', 1],
    ['12,5', 1250],
    ['100', 10000],
    ['100,00', 10000],
  ])('reads %j as %d basis points', (input, basisPoints) => {
    expect(parsePercent(input)).toBe(basisPoints);
  });

  it.each(['100,01', '101', '-1', '', 'abc', '2,755', '3 %'])('rejects %j', (input) => {
    expect(parsePercent(input)).toBeNull();
  });
});

describe('formatPercent', () => {
  it('formats basis points as a French percentage', () => {
    expect(formatPercent(275)).toBe('2,75\u00A0%');
    expect(formatPercent(300)).toBe('3\u00A0%');
    expect(formatPercent(0)).toBe('0\u00A0%');
    expect(formatPercent(10000)).toBe('100\u00A0%');
  });
});
