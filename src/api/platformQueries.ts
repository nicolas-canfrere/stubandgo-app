import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { type ApiProblem, unwrap } from './problem';
import type { components } from './schema';

export type PlatformOrganization = components['schemas']['OrganizationAdmin'];
export type InviteMemberBody = components['schemas']['InviteMemberRequest'];
export type CreateOrganizationBody = components['schemas']['CreateOrganizationRequest'];

const ORGANIZATIONS_KEY = ['platform', 'organizations'];

export function usePlatformOrganizations() {
  return useQuery<PlatformOrganization[], ApiProblem>({
    queryKey: ORGANIZATIONS_KEY,
    queryFn: async () => (await unwrap(api.GET('/api/platform/organizations'))).organizations,
  });
}

/** Runs a platform mutation and refetches the organization list once it settles. */
function usePlatformMutation<V, D>(mutationFn: (variables: V) => Promise<D>) {
  const queryClient = useQueryClient();

  return useMutation<D, ApiProblem, V>({
    mutationFn,
    onSettled: () => queryClient.invalidateQueries({ queryKey: ORGANIZATIONS_KEY }),
  });
}

export function useCreateOrganization() {
  return usePlatformMutation((body: CreateOrganizationBody) =>
    unwrap(api.POST('/api/platform/organizations', { body })),
  );
}

export function useProvisionOrganization() {
  return usePlatformMutation((organizationId: string) =>
    unwrap(
      api.POST('/api/platform/organizations/{organizationId}/provisioning', {
        params: { path: { organizationId } },
      }),
    ),
  );
}

export function useChangeCommissionRate() {
  return usePlatformMutation((change: { organizationId: string; commissionBasisPoints: number }) =>
    unwrap(
      api.PUT('/api/platform/organizations/{organizationId}/commission-rate', {
        params: { path: { organizationId: change.organizationId } },
        body: { commissionBasisPoints: change.commissionBasisPoints },
      }),
    ),
  );
}

export function useInviteMember() {
  return usePlatformMutation((invitation: { organizationId: string; body: InviteMemberBody }) =>
    unwrap(
      api.POST('/api/platform/organizations/{organizationId}/invitations', {
        params: { path: { organizationId: invitation.organizationId } },
        body: invitation.body,
      }),
    ),
  );
}
