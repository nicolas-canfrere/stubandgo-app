import { describe, expect, it } from 'vitest';
import { staffOidcConfig } from './staffOidcConfig';

describe('staffOidcConfig', () => {
  it('testScopeOmitsEmailBecauseTheStaffRealmHasNoEmailScope', () => {
    expect(staffOidcConfig.scope.split(' ')).toEqual(['openid', 'profile']);
  });
});
