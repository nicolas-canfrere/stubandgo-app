const dateFormat = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const euroFormat = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

/** Formats an API UTC instant as e.g. "ven. 27 nov. 2026 · 20:00" in Europe/Paris. */
export function formatDateTime(isoUtc: string): string {
  const parts = Object.fromEntries(
    dateFormat.formatToParts(new Date(isoUtc)).map((part) => [part.type, part.value]),
  );

  return `${parts.weekday} ${parts.day} ${parts.month} ${parts.year} · ${parts.hour}:${parts.minute}`;
}

/** Formats an amount in cents as euros (display only). */
export function formatEuros(cents: number): string {
  return euroFormat.format(cents / 100);
}
