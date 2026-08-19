import { ConfigService } from '@nestjs/config';
import { validateJwtConfig, getJwtModuleOptions } from './jwt.config';

describe('jwt.config', () => {
  const createMockConfigService = (
    secret?: string,
    expiresIn?: string,
  ): ConfigService => {
    return {
      get: jest.fn((key: string) => {
        if (key === 'JWT_SECRET') return secret;
        if (key === 'JWT_EXPIRATION') return expiresIn;
        return undefined;
      }),
    } as unknown as ConfigService;
  };

  it('should throw an error if JWT_SECRET is missing', () => {
    const config = createMockConfigService(undefined, '8h');
    expect(() => validateJwtConfig(config)).toThrow(
      /JWT_SECRET environment variable is missing/,
    );
  });

  it('should throw an error if JWT_SECRET is shorter than 32 bytes', () => {
    const config = createMockConfigService('short_secret_key_12345', '8h');
    expect(() => validateJwtConfig(config)).toThrow(
      /JWT_SECRET must contain at least 32 bytes/,
    );
  });

  it('should throw an error if JWT_EXPIRATION is missing', () => {
    const config = createMockConfigService(
      'super_secret_key_that_is_at_least_32_bytes_long',
      undefined,
    );
    expect(() => validateJwtConfig(config)).toThrow(
      /JWT_EXPIRATION environment variable is missing/,
    );
  });

  it('should throw an error if JWT_EXPIRATION has an invalid format', () => {
    const validSecret = 'super_secret_key_that_is_at_least_32_bytes_long';

    expect(() =>
      validateJwtConfig(createMockConfigService(validSecret, '0h')),
    ).toThrow(/Invalid JWT_EXPIRATION format/);

    expect(() =>
      validateJwtConfig(createMockConfigService(validSecret, '-15m')),
    ).toThrow(/Invalid JWT_EXPIRATION format/);

    expect(() =>
      validateJwtConfig(createMockConfigService(validSecret, '8')),
    ).toThrow(/Invalid JWT_EXPIRATION format/);

    expect(() =>
      validateJwtConfig(createMockConfigService(validSecret, 'invalid_time')),
    ).toThrow(/Invalid JWT_EXPIRATION format/);
  });

  it('should return valid options when configuration is correct', () => {
    const validSecret = 'super_secret_key_that_is_at_least_32_bytes_long';
    const config = createMockConfigService(validSecret, '8h');

    const options = getJwtModuleOptions(config);

    expect(options.secret).toBe(validSecret);
    expect(options.signOptions?.expiresIn).toBe('8h');
    expect(options.signOptions?.algorithm).toBe('HS256');
  });
});
