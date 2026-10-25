import type { UserProfile } from 'oidc-client-ts';
import { readMember } from './member';

function profile(extra: Record<string, unknown> = {}): UserProfile {
  return { iss: 'x', sub: 's', aud: 'a', exp: 1, iat: 1, name: 'Camille Contrôle', ...extra };
}

describe('readMember', () => {
  it('reads the single organization slug from the organization claim', () => {
    const member = readMember(profile({ organization: { 'demo-rock-asso': { id: '0f8c' } } }));

    expect(member?.organizationSlug).toBe('demo-rock-asso');
    expect(member?.name).toBe('Camille Contrôle');
  });

  it('has no organization when the claim is absent', () => {
    expect(readMember(profile())?.organizationSlug).toBeNull();
  });

  it('has no organization when the claim holds several', () => {
    const claim = { 'demo-rock-asso': { id: '1' }, 'demo-theatre-ville': { id: '2' } };

    expect(readMember(profile({ organization: claim }))?.organizationSlug).toBeNull();
  });

  it('is a controller when the realm role is present', () => {
    const roles = { realm_access: { roles: ['organization-controller'] } };

    expect(readMember(profile(roles))?.isController).toBe(true);
  });

  it('is not a controller when the realm role is absent', () => {
    expect(
      readMember(profile({ realm_access: { roles: ['organization-admin'] } }))?.isController,
    ).toBe(false);
    expect(readMember(profile())?.isController).toBe(false);
  });

  it('falls back to the preferred username, then to no member', () => {
    expect(
      readMember(profile({ name: undefined, preferred_username: 'controleur.rock' }))?.name,
    ).toBe('controleur.rock');
    expect(readMember(profile({ name: undefined }))).toBeNull();
  });
});
