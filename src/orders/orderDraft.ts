/** The order form content, passed as navigation state to restore it (key = priceTierId). */
export type OrderDraft = { buyerEmail: string; quantities: Record<string, number> };

/** Reads a navigation state as an OrderDraft; anything malformed is ignored (null). */
export function readOrderDraft(state: unknown): OrderDraft | null {
  if (typeof state !== 'object' || state === null) {
    return null;
  }

  const { buyerEmail, quantities } = state as Record<string, unknown>;
  if (typeof buyerEmail !== 'string' || typeof quantities !== 'object' || quantities === null) {
    return null;
  }

  const entries = Object.entries(quantities);
  if (!entries.every(([, value]) => Number.isInteger(value) && (value as number) >= 0)) {
    return null;
  }

  return { buyerEmail, quantities: Object.fromEntries(entries) as Record<string, number> };
}
