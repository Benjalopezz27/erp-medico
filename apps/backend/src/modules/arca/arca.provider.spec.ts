import { ConfigService } from '@nestjs/config';
import { arcaServiceProvider } from './arca.provider';
import { ArcaMockService } from './arca-mock.service';

describe('arcaServiceProvider', () => {
  const originalEnv = process.env;

  const createMockConfigService = (
    nodeEnv?: string,
    arcaEnv?: string,
  ): ConfigService => {
    return {
      get: jest.fn((key: string) => {
        if (key === 'NODE_ENV') return nodeEnv;
        if (key === 'ARCA_ENV') return arcaEnv;
        return undefined;
      }),
    } as unknown as ConfigService;
  };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const getProviderInstance = (configService: ConfigService) => {
    if (typeof (arcaServiceProvider as any).useFactory !== 'function') {
      throw new Error('arcaServiceProvider does not have a useFactory method.');
    }
    return (arcaServiceProvider as any).useFactory(configService);
  };

  it('should instantiate ArcaMockService in development environment (development + development)', () => {
    process.env.NODE_ENV = 'development';
    process.env.ARCA_ENV = 'development';
    const config = createMockConfigService('development', 'development');

    const service = getProviderInstance(config);

    expect(service).toBeInstanceOf(ArcaMockService);
  });

  it('should instantiate ArcaMockService in test environment (test + development)', () => {
    process.env.NODE_ENV = 'test';
    process.env.ARCA_ENV = 'development';
    const config = createMockConfigService('test', 'development');

    const service = getProviderInstance(config);

    expect(service).toBeInstanceOf(ArcaMockService);
  });

  it('should throw an error in production environment with ARCA_ENV=development', () => {
    process.env.NODE_ENV = 'production';
    process.env.ARCA_ENV = 'development';
    const config = createMockConfigService('production', 'development');

    expect(() => getProviderInstance(config)).toThrow(
      /Production ARCA client is not implemented/,
    );
  });

  it('should throw an error in production environment with ARCA_ENV=production', () => {
    process.env.NODE_ENV = 'production';
    process.env.ARCA_ENV = 'production';
    const config = createMockConfigService('production', 'production');

    expect(() => getProviderInstance(config)).toThrow(
      /Production ARCA client is not implemented/,
    );
  });

  it('should throw an error if ARCA_ENV=homologation', () => {
    process.env.NODE_ENV = 'development';
    process.env.ARCA_ENV = 'homologation';
    const config = createMockConfigService('development', 'homologation');

    expect(() => getProviderInstance(config)).toThrow(
      /Homologation ARCA client is not implemented/,
    );
  });

  it('should throw an error if NODE_ENV is missing', () => {
    process.env.ARCA_ENV = 'development';
    const config = createMockConfigService(undefined, 'development');

    expect(() => getProviderInstance(config)).toThrow(
      /Invalid ARCA environment configuration/,
    );
  });

  it('should throw an error if ARCA_ENV is missing', () => {
    process.env.NODE_ENV = 'development';
    const config = createMockConfigService('development', undefined);

    expect(() => getProviderInstance(config)).toThrow(
      /Invalid ARCA environment configuration/,
    );
  });

  it('should throw an error if ARCA_ENV has an invalid value', () => {
    process.env.NODE_ENV = 'development';
    process.env.ARCA_ENV = 'staging';
    const config = createMockConfigService('development', 'staging');

    expect(() => getProviderInstance(config)).toThrow(
      /Invalid ARCA environment configuration/,
    );
  });
});
