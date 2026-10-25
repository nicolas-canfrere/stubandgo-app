import { describe, expect, it } from 'vitest';
import { formatDateTime, formatEuros } from './format';

const plain = (value: string) => value.replace(/\s/g, ' ');

describe('formatDateTime', () => {
  it('shows winter time in Europe/Paris', () => {
    expect(formatDateTime('2026-11-27T19:00:00Z')).toBe('ven. 27 nov. 2026 · 20:00');
  });

  it('shows summer time in Europe/Paris', () => {
    expect(formatDateTime('2026-07-14T18:30:00Z')).toBe('mar. 14 juil. 2026 · 20:30');
  });
});

describe('formatEuros', () => {
  it('formats cents as euros', () => {
    expect(plain(formatEuros(2500))).toBe('25,00 €');
    expect(plain(formatEuros(0))).toBe('0,00 €');
  });
});
