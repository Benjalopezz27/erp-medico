import { sanitizeAuditSnapshot } from './sanitizer.utils';

describe('SanitizerUtils', () => {
  it('should deeply strip sensitive password, hash, token, and secret keys', () => {
    const input = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test Admin',
      email: 'admin@erp.com',
      password: 'PlainSecretPassword123!',
      passwordHash: '$2b$12$someBcryptHashValue...',
      password_hash: '$2b$12$anotherHash...',
      token: 'jwt-bearer-token',
      accessToken: 'access-1234',
      refreshToken: 'refresh-5678',
      secret: 'super-secret',
      credentials: {
        password: 'nested-password',
        authHeader: 'Bearer 123',
      },
      metadata: {
        role: 'ADMINISTRADOR',
        nestedArray: [
          { name: 'Item 1', password: 'bad' },
          { name: 'Item 2', safeProperty: true },
        ],
      },
    };

    const sanitized = sanitizeAuditSnapshot(input);

    expect(sanitized).toEqual({
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test Admin',
      email: 'admin@erp.com',
      metadata: {
        role: 'ADMINISTRADOR',
        nestedArray: [{ name: 'Item 1' }, { name: 'Item 2', safeProperty: true }],
      },
    });
  });

  it('should handle primitives, null, and undefined gracefully', () => {
    expect(sanitizeAuditSnapshot(null)).toBeNull();
    expect(sanitizeAuditSnapshot(undefined)).toBeUndefined();
    expect(sanitizeAuditSnapshot('simple-string')).toBe('simple-string');
    expect(sanitizeAuditSnapshot(12345)).toBe(12345);
    expect(sanitizeAuditSnapshot(true)).toBe(true);
  });
});
