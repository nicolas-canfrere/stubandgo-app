import type { OrderStatus } from '../api/problem';

export type OrderPage = 'payment' | 'confirmation' | 'ended';

/** Which page an order in this status belongs to. */
export function pageForStatus(status: OrderStatus): OrderPage {
  switch (status) {
    case 'pending':
      return 'payment';
    case 'paid':
      return 'confirmation';
    default:
      return 'ended';
  }
}
