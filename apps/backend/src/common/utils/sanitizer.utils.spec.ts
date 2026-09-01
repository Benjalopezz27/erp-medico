import {
  redactSecrets,
  stripSensitiveKeys,
  REDACTED_VALUE,
} from './sanitizer.utils';

describe('sanitizer.utils', () => {
  it('redacts sensitive ARCA and Redis keys in nested objects', () => {
    const input = {
      module: 'arca',
      arca_cert_password: 'SuperSecretPassword123!',
      arca_cert_base64: 'MIIKWAIBAzCCCh8GCSqGSIb3DQEHAaCCC...',
      wsaa_token: 'secret-token-abc',
      wsaa_sign: 'secret-sign-def',
      tra_cms: 'MIAGCSqGSIb3DQEHAqCAMIACAQExDz...',
      redis_password: 'redis_secret_pass',
      redis_url: 'redis://:password123@redis.railway.internal:6379',
      safeField: 'safeValue',
      config: {
        arca_cert_path: '/secrets/homo_cert.p12',
        password: 'nestedPassword',
      },
    };

    const sanitized = redactSecrets(input);

    expect(sanitized.module).toBe('arca');
    expect(sanitized.safeField).toBe('safeValue');
    expect(sanitized.arca_cert_password).toBe(REDACTED_VALUE);
    expect(sanitized.arca_cert_base64).toBe(REDACTED_VALUE);
    expect(sanitized.wsaa_token).toBe(REDACTED_VALUE);
    expect(sanitized.wsaa_sign).toBe(REDACTED_VALUE);
    expect(sanitized.tra_cms).toBe(REDACTED_VALUE);
    expect(sanitized.redis_password).toBe(REDACTED_VALUE);
    expect(sanitized.redis_url).toBe(REDACTED_VALUE);
    expect(sanitized.config.arca_cert_path).toBe(REDACTED_VALUE);
    expect(sanitized.config.password).toBe(REDACTED_VALUE);
  });

  it('redacts Bearer tokens and PEM private keys embedded inside strings', () => {
    const stringData =
      'Error occurred while contacting WSAA with auth Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-IDN context';
    expect(redactSecrets(stringData)).toBe(
      `Error occurred while contacting WSAA with auth Bearer ${REDACTED_VALUE} context`,
    );

    const pemKey = `Header\n-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0...\n-----END RSA PRIVATE KEY-----\nFooter`;
    expect(redactSecrets(pemKey)).toBe(`Header\n${REDACTED_VALUE}\nFooter`);
  });

  it('redacts XML credential tags <token> and <sign> in strings and SOAP faults', () => {
    const soapResponse =
      '<loginTicketResponse><credentials><token>PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4=</token><sign>k8f2kd092jf90j209fj</sign></credentials></loginTicketResponse>';
    const sanitized = redactSecrets(soapResponse);
    expect(sanitized).toBe(
      `<loginTicketResponse><credentials><token>${REDACTED_VALUE}</token><sign>${REDACTED_VALUE}</sign></credentials></loginTicketResponse>`,
    );
  });

  it('strips sensitive keys in strip mode', () => {
    const input = {
      username: 'admin',
      password: 'secretPassword',
      arca_cert_password: 'certPass',
      role: 'ADMINISTRADOR',
    };

    const stripped = stripSensitiveKeys(input);
    expect(stripped).toEqual({
      username: 'admin',
      role: 'ADMINISTRADOR',
    });
  });

  it('does not redact innocent keys matching partial words', () => {
    const innocent = {
      productKey: 'PROD-001',
      tokenCount: 42,
      certificateType: 'X.509',
    };
    expect(redactSecrets(innocent)).toEqual(innocent);
  });

  it('handles circular references and errors without throwing', () => {
    const circular: any = { name: 'test' };
    circular.self = circular;

    const sanitizedCircular = redactSecrets(circular);
    expect(sanitizedCircular.name).toBe('test');
    expect(sanitizedCircular.self).toBe('[Circular]');

    const err = new Error('SOAP Fault with error message');
    const sanitizedErr = redactSecrets(err);
    expect(sanitizedErr.name).toBe('Error');
    expect(sanitizedErr.message).toBe('SOAP Fault with error message');
  });
});
