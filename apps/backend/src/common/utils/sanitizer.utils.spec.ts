import {
  redactSecrets,
  stripSensitiveKeys,
  REDACTED_VALUE,
} from './sanitizer.utils';

describe('SanitizerUtils (Common)', () => {
  describe('redactSecrets', () => {
    it('redacts sensitive credentials and tokens with [REDACTED]', () => {
      const input = {
        id: '123',
        password: 'plain_password',
        currentPassword: 'old_pass',
        newPassword: 'new_pass',
        passwordHash: '$2b$12$hash...',
        authorization: 'Bearer secret-token-123',
        cookie: 'session=123',
        token: 'eyJhbGciOi...',
        accessToken: 'access-123',
        refreshToken: 'refresh-456',
        jwt_secret: 'secret-key',
        seed_admin_password: 'admin-password',
        apiKey: 'api-key-999',
        privateKey:
          '-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----',
        db_password: 'pg_secret_password',
        arca_cert_password: 'cert_pass',
      };

      const redacted = redactSecrets(input);

      expect(redacted.password).toBe(REDACTED_VALUE);
      expect(redacted.currentPassword).toBe(REDACTED_VALUE);
      expect(redacted.newPassword).toBe(REDACTED_VALUE);
      expect(redacted.passwordHash).toBe(REDACTED_VALUE);
      expect(redacted.authorization).toBe(REDACTED_VALUE);
      expect(redacted.cookie).toBe(REDACTED_VALUE);
      expect(redacted.token).toBe(REDACTED_VALUE);
      expect(redacted.accessToken).toBe(REDACTED_VALUE);
      expect(redacted.refreshToken).toBe(REDACTED_VALUE);
      expect(redacted.jwt_secret).toBe(REDACTED_VALUE);
      expect(redacted.seed_admin_password).toBe(REDACTED_VALUE);
      expect(redacted.apiKey).toBe(REDACTED_VALUE);
      expect(redacted.privateKey).toBe(REDACTED_VALUE);
      expect(redacted.db_password).toBe(REDACTED_VALUE);
      expect(redacted.arca_cert_password).toBe(REDACTED_VALUE);
      expect(redacted.id).toBe('123');
    });

    it('does NOT redact functional non-sensitive keys like productKey, monkey, or tokenCount', () => {
      const input = {
        productKey: 'PROD-KEY-001',
        monkey: 'banana',
        tokenCount: 42,
        keyIndex: 5,
        isPrimarySupplier: true,
      };

      const result = redactSecrets(input);

      expect(result.productKey).toBe('PROD-KEY-001');
      expect(result.monkey).toBe('banana');
      expect(result.tokenCount).toBe(42);
      expect(result.keyIndex).toBe(5);
      expect(result.isPrimarySupplier).toBe(true);
    });

    it('recursively redacts nested objects and arrays', () => {
      const input = {
        user: {
          name: 'Admin',
          details: {
            password: 'secret_nested_password',
          },
          credentials: {
            authHeader: 'Bearer 123',
          },
        },
        items: [
          { sku: 'MED-1', token: 'jwt.token' },
          { sku: 'MED-2', normalField: 'safe' },
        ],
      };

      const redacted = redactSecrets(input);

      expect(redacted.user.name).toBe('Admin');
      expect(redacted.user.details.password).toBe(REDACTED_VALUE);
      expect(redacted.user.credentials).toBe(REDACTED_VALUE);
      expect(redacted.items[0].token).toBe(REDACTED_VALUE);
      expect(redacted.items[0].sku).toBe('MED-1');
      expect(redacted.items[1].normalField).toBe('safe');
    });

    it('redacts Bearer tokens embedded in string headers/values', () => {
      const input =
        'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.do_not_leak';
      const redacted = redactSecrets(input);
      expect(redacted).toBe(`Authorization: Bearer ${REDACTED_VALUE}`);
    });

    it('handles circular references gracefully', () => {
      const circular: any = { name: 'Root' };
      circular.self = circular;

      const result = redactSecrets(circular);
      expect(result.name).toBe('Root');
      expect(result.self).toBe('[Circular]');
    });

    it('handles primitives, null, undefined, Error, and Date instances', () => {
      expect(redactSecrets(null)).toBeNull();
      expect(redactSecrets(undefined)).toBeUndefined();
      expect(redactSecrets('safe-string')).toBe('safe-string');
      expect(redactSecrets(1234)).toBe(1234);
      expect(redactSecrets(true)).toBe(true);

      const now = new Date();
      expect(redactSecrets(now)).toEqual(now);

      const err = new Error('Database password failed');
      const redactedErr = redactSecrets(err);
      expect(redactedErr.name).toBe('Error');
      expect(redactedErr.message).toBe('Database password failed');
    });
  });

  describe('stripSensitiveKeys', () => {
    it('completely strips sensitive keys from objects', () => {
      const input = {
        id: '123',
        password: 'plain_password',
        metadata: {
          role: 'ADMINISTRADOR',
          token: 'strip-me',
        },
      };

      const stripped = stripSensitiveKeys(input);
      expect(stripped).toEqual({
        id: '123',
        metadata: {
          role: 'ADMINISTRADOR',
        },
      });
      expect('password' in stripped).toBe(false);
      expect('token' in (stripped as any).metadata).toBe(false);
    });
  });
});
