import type { OrderLine } from '../api/queries';

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

/** Navigation state when present, otherwise the quantities of the order lines and no email. */
export function draftForOrder(state: unknown, lines: OrderLine[]): OrderDraft {
  const fromState = readOrderDraft(state);
  if (fromState !== null) {
    return fromState;
  }

  const quantities: Record<string, number> = {};
  for (const line of lines) {
    if (line.priceTierId !== undefined) {
      quantities[line.priceTierId] = line.quantity ?? 0;
    }
  }

  return { buyerEmail: '', quantities };
}
