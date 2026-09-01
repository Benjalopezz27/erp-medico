import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { redisConnectionProvider } from './redis-client.factory';

jest.mock('ioredis', () => {
  const mockRedis = jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    disconnect: jest.fn(),
    quit: jest.fn(),
  }));
  return {
    __esModule: true,
    default: mockRedis,
    Redis: mockRedis,
  };
});

describe('redisConnectionProvider', () => {
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfigService = {
      get: jest.fn(),
    } as any;
  });

  const getRedis = () => {
    const factory = (redisConnectionProvider as any).useFactory;
    return factory(mockConfigService);
  };

  it('connects using REDIS_URL when present', () => {
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'REDIS_URL')
        return 'redis://:password123@redis.railway.internal:6379';
      return undefined;
    });

    getRedis();
    expect(Redis).toHaveBeenCalledWith(
      'redis://:password123@redis.railway.internal:6379',
      expect.objectContaining({ maxRetriesPerRequest: null }),
    );
  });

  it('connects using REDIS_HOST, REDIS_PORT and password when REDIS_URL is not set', () => {
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'REDIS_HOST') return 'redis-host';
      if (key === 'REDIS_PORT') return 6380;
      if (key === 'REDIS_PASSWORD') return 'mysecret';
      return undefined;
    });

    getRedis();
    expect(Redis).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'redis-host',
        port: 6380,
        password: 'mysecret',
        maxRetriesPerRequest: null,
      }),
    );
  });
});
