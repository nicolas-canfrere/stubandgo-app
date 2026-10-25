import type { UserProfile } from 'oidc-client-ts';

export type Member = {
  name: string;
  organizationSlug: string | null;
  isController: boolean;
  isOrganizationAdmin: boolean;
  isPlatformAdmin: boolean;
};

const CONTROLLER_ROLE = 'organization-controller';
const ORGANIZATION_ADMIN_ROLE = 'organization-admin';
const PLATFORM_ADMIN_ROLE = 'platform-admin';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function organizationSlug(claim: unknown): string | null {
  if (!isRecord(claim)) {
    return null;
  }
  const slugs = Object.keys(claim);

  return slugs.length === 1 ? (slugs[0] ?? null) : null;
}

function hasRealmRole(realmAccess: unknown, role: string): boolean {
  return isRecord(realmAccess) && Array.isArray(realmAccess.roles)
    ? realmAccess.roles.includes(role)
    : false;
}

/** Reads the signed-in member from the ID token claims; null when the token names nobody. */
export function readMember(profile: UserProfile): Member | null {
  const name = [profile.name, profile.preferred_username].find(
    (candidate): candidate is string => typeof candidate === 'string' && candidate !== '',
  );
  if (name === undefined) {
    return null;
  }

  return {
    name,
    organizationSlug: organizationSlug(profile.organization),
    isController: hasRealmRole(profile.realm_access, CONTROLLER_ROLE),
    isOrganizationAdmin: hasRealmRole(profile.realm_access, ORGANIZATION_ADMIN_ROLE),
    isPlatformAdmin: hasRealmRole(profile.realm_access, PLATFORM_ADMIN_ROLE),
  };
}
