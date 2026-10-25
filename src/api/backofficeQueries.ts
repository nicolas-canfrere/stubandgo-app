import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EventPayload } from '../backoffice/eventDraft';
import { api } from './client';
import { type ApiProblem, unwrap } from './problem';
import type { components, operations } from './schema';

export type BackofficeEvent = components['schemas']['BackofficeEvent'];
export type BackofficeEventSummary = components['schemas']['BackofficeEventSummary'];
export type EventSales =
  operations['get_sales_backoffice_get_event_sales']['responses'][200]['content']['application/json'];
export type InviteMemberBody = components['schemas']['InviteMemberRequest'];

const EVENTS_KEY = ['backoffice', 'events'];
const eventKey = (eventId: string) => [...EVENTS_KEY, eventId];

export function useBackofficeEvents() {
  return useQuery<BackofficeEventSummary[], ApiProblem>({
    queryKey: EVENTS_KEY,
    queryFn: async () => (await unwrap(api.GET('/api/backoffice/events'))).events,
  });
}

export function useBackofficeEvent(eventId: string) {
  return useQuery<BackofficeEvent, ApiProblem>({
    queryKey: eventKey(eventId),
    queryFn: () =>
      unwrap(api.GET('/api/backoffice/events/{eventId}', { params: { path: { eventId } } })),
  });
}

export function useEventSales(eventId: string) {
  return useQuery<EventSales, ApiProblem>({
    queryKey: [...eventKey(eventId), 'sales'],
    queryFn: () =>
      unwrap(api.GET('/api/backoffice/events/{eventId}/sales', { params: { path: { eventId } } })),
  });
}

/** Runs an event mutation, stores the returned event as the detail and refreshes the list. */
function useEventMutation<V>(mutationFn: (variables: V) => Promise<BackofficeEvent>) {
  const queryClient = useQueryClient();

  return useMutation<BackofficeEvent, ApiProblem, V>({
    mutationFn,
    onSuccess: (event) => {
      queryClient.setQueryData(eventKey(event.id), event);
      return queryClient.invalidateQueries({ queryKey: EVENTS_KEY, exact: true });
    },
  });
}

export function useCreateEvent() {
  // A new event has new tiers only: the creation body carries no tier id.
  return useEventMutation(({ priceTiers, ...event }: EventPayload) =>
    unwrap(
      api.POST('/api/backoffice/events', {
        body: {
          ...event,
          priceTiers: priceTiers.map(({ label, priceCents }) => ({ label, priceCents })),
        },
      }),
    ),
  );
}

export function useReviseEvent(eventId: string) {
  return useEventMutation((body: EventPayload) =>
    unwrap(
      api.PUT('/api/backoffice/events/{eventId}', {
        params: { path: { eventId } },
        body,
      }),
    ),
  );
}

export function usePublishEvent(eventId: string) {
  return useEventMutation(() =>
    unwrap(
      api.POST('/api/backoffice/events/{eventId}/publication', {
        params: { path: { eventId } },
      }),
    ),
  );
}

export function useUnpublishEvent(eventId: string) {
  return useEventMutation(() =>
    unwrap(
      api.DELETE('/api/backoffice/events/{eventId}/publication', {
        params: { path: { eventId } },
      }),
    ),
  );
}

export function useInviteOrganizationMember() {
  return useMutation<unknown, ApiProblem, InviteMemberBody>({
    mutationFn: (body) => unwrap(api.POST('/api/backoffice/invitations', { body })),
  });
}
