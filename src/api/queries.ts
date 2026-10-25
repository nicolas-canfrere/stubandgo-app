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
