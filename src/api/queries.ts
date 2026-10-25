import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { components } from './schema';
import { type ApiProblem, unwrap } from './problem';

export function useUpcomingEvents() {
  return useQuery<Awaited<ReturnType<typeof fetchUpcomingEvents>>, ApiProblem>({
    queryKey: ['events'],
    queryFn: fetchUpcomingEvents,
  });
}

export function useOrganization(slug: string) {
  return useQuery<Awaited<ReturnType<typeof fetchOrganization>>, ApiProblem>({
    queryKey: ['organizations', slug],
    queryFn: () => fetchOrganization(slug),
  });
}

function fetchUpcomingEvents() {
  return unwrap(api.GET('/api/events'));
}

function fetchOrganization(slug: string) {
  return unwrap(api.GET('/api/organizations/{slug}', { params: { path: { slug } } }));
}

export function useEvent(id: string) {
  return useQuery<Awaited<ReturnType<typeof fetchEvent>>, ApiProblem>({
    queryKey: ['events', id],
    queryFn: () => fetchEvent(id),
  });
}

export function useAvailability(id: string) {
  return useQuery<Awaited<ReturnType<typeof fetchAvailability>>, ApiProblem>({
    queryKey: ['availability', id],
    queryFn: () => fetchAvailability(id),
  });
}

type PlaceOrderBody = components['schemas']['PlaceOrderRequest'];

/** Places an order; the remaining seats are refetched after a success or an error. */
export function usePlaceOrder() {
  const queryClient = useQueryClient();

  return useMutation<Awaited<ReturnType<typeof placeOrder>>, ApiProblem, PlaceOrderBody>({
    mutationFn: placeOrder,
    onSettled: (_data, _error, body) =>
      queryClient.invalidateQueries({ queryKey: ['availability', body.eventId] }),
  });
}

function fetchEvent(eventId: string) {
  return unwrap(api.GET('/api/events/{eventId}', { params: { path: { eventId } } }));
}

function fetchAvailability(eventId: string) {
  return unwrap(api.GET('/api/events/{eventId}/availability', { params: { path: { eventId } } }));
}

function placeOrder(body: PlaceOrderBody) {
  return unwrap(api.POST('/api/orders', { body }));
}

export function useOrder(id: string) {
  return useQuery<Awaited<ReturnType<typeof fetchOrder>>, ApiProblem>({
    queryKey: ['orders', id],
    queryFn: () => fetchOrder(id),
  });
}

/** Pays an order; the order is refetched, and the seats too when the payment failed. */
export function usePayOrder(orderId: string, eventId: string) {
  const queryClient = useQueryClient();

  return useMutation<Awaited<ReturnType<typeof payOrder>>, ApiProblem, string>({
    mutationFn: (cardNumber) => payOrder(orderId, cardNumber),
    onSettled: async (_data, error) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['orders', orderId] }),
        error ? queryClient.invalidateQueries({ queryKey: ['availability', eventId] }) : undefined,
      ]);
    },
  });
}

function fetchOrder(orderId: string) {
  return unwrap(api.GET('/api/orders/{orderId}', { params: { path: { orderId } } }));
}

function payOrder(orderId: string, cardNumber: string) {
  return unwrap(
    api.POST('/api/orders/{orderId}/payment', {
      params: { path: { orderId } },
      body: { cardNumber },
    }),
  );
}

export type ScanVerdict = Awaited<ReturnType<typeof scanTicket>>;
export type ScanOutcome = ScanVerdict['outcome'];

/** Scans a ticket token at the gate of an event; the token is a bearer secret, never logged. */
export function useScanTicket(eventId: string) {
  return useMutation<ScanVerdict, ApiProblem, string>({
    mutationFn: (token) => scanTicket(eventId, token),
  });
}

function scanTicket(eventId: string, token: string) {
  return unwrap(
    api.POST('/api/events/{eventId}/scans', { params: { path: { eventId } }, body: { token } }),
  );
}
