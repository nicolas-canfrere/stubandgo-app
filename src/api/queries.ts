import { useQuery } from '@tanstack/react-query';
import { api } from './client';
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
