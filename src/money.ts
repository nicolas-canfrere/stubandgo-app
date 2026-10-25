// Parsers for amounts typed by a person. Integer arithmetic only: no float ever holds a price.
// `formatEuros` (cents to euros) lives in format.ts.

const DECIMAL = /^(\d+)(?:[.,](\d{1,2}))?$/;

/** Splits "12", "12,5" or "12.50" into the whole part and the hundredths; null when malformed. */
function parseHundredths(input: string): { whole: number; hundredths: number } | null {
  const match = DECIMAL.exec(input.trim());
  if (match === null) {
    return null;
  }

  return { whole: Number(match[1]), hundredths: Number((match[2] ?? '').padEnd(2, '0')) };
}

/** Parses an amount in euros into cents; null when negative, malformed or with over two decimals. */
export function parseEuros(input: string): number | null {
  const parsed = parseHundredths(input);
  if (parsed === null) {
    return null;
  }
  const cents = parsed.whole * 100 + parsed.hundredths;

  // Beyond 2^53 an integer is no longer exact: such an amount is refused, not rounded.
  return Number.isSafeInteger(cents) ? cents : null;
}

/** Parses a percentage (0 to 100, two decimals at most) into basis points; null otherwise. */
export function parsePercent(input: string): number | null {
  const basisPoints = parseEuros(input);

  return basisPoints === null || basisPoints > 10000 ? null : basisPoints;
}

const percentFormat = new Intl.NumberFormat('fr-FR', {
  style: 'percent',
  maximumFractionDigits: 2,
});

/** Formats basis points as a percentage (display only), e.g. 275 gives "2,75 %". */
export function formatPercent(basisPoints: number): string {
  return percentFormat.format(basisPoints / 10000);
}
