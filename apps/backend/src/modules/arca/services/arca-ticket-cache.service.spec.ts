import { ArcaTicketCacheService } from './arca-ticket-cache.service';

describe('ArcaTicketCacheService', () => {
  let redis: { get: jest.Mock; set: jest.Mock };
  let service: ArcaTicketCacheService;

  beforeEach(() => {
    redis = { get: jest.fn(), set: jest.fn() };
    service = new ArcaTicketCacheService(redis as any);
  });

  it('returns null on a cache miss', async () => {
    redis.get.mockResolvedValue(null);
    const result = await service.get('homologation', '20123456789');
    expect(result).toBeNull();
  });

  it('returns the cached ticket on a hit', async () => {
    const ticket = {
      token: 'tok',
      sign: 'sig',
      expirationTime: '2026-01-01T00:00:00Z',
    };
    redis.get.mockResolvedValue(JSON.stringify(ticket));
    const result = await service.get('homologation', '20123456789');
    expect(result).toEqual(ticket);
    expect(redis.get).toHaveBeenCalledWith(
      'arca:wsaa:ticket:homologation:20123456789',
    );
  });

  it('isolates cache keys by environment and CUIT', async () => {
    await service.get('production', '20123456789');
    expect(redis.get).toHaveBeenCalledWith(
      'arca:wsaa:ticket:production:20123456789',
    );

    await service.get('homologation', '30111111118');
    expect(redis.get).toHaveBeenCalledWith(
      'arca:wsaa:ticket:homologation:30111111118',
    );
  });

  it('sets a TTL capped at 12h minus the renewal margin', async () => {
    const farFutureExpiration = new Date(
      Date.now() + 20 * 60 * 60 * 1000,
    ).toISOString();
    const ticket = {
      token: 't',
      sign: 's',
      expirationTime: farFutureExpiration,
    };

    await service.set('homologation', '20123456789', ticket);

    expect(redis.set).toHaveBeenCalledWith(
      'arca:wsaa:ticket:homologation:20123456789',
      JSON.stringify(ticket),
      'EX',
      12 * 60 * 60 - 10 * 60,
    );
  });

  it('uses the real expiration when shorter than the 12h max', async () => {
    const soonExpiration = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min
    const ticket = { token: 't', sign: 's', expirationTime: soonExpiration };

    await service.set('homologation', '20123456789', ticket);

    const [, , , ttlSeconds] = redis.set.mock.calls[0];
    expect(ttlSeconds).toBeLessThanOrEqual(30 * 60 - 10 * 60);
    expect(ttlSeconds).toBeGreaterThan(0);
  });

  it('skips caching when the ticket is already inside its renewal margin', async () => {
    const almostExpired = new Date(Date.now() + 60 * 1000).toISOString(); // 1 min
    const ticket = { token: 't', sign: 's', expirationTime: almostExpired };

    await service.set('homologation', '20123456789', ticket);

    expect(redis.set).not.toHaveBeenCalled();
  });

  it('degrades to a cache miss when Redis get fails', async () => {
    redis.get.mockRejectedValue(new Error('ECONNREFUSED'));
    const result = await service.get('homologation', '20123456789');
    expect(result).toBeNull();
  });

  it('degrades silently when Redis set fails', async () => {
    redis.set.mockRejectedValue(new Error('ECONNREFUSED'));
    const ticket = {
      token: 't',
      sign: 's',
      expirationTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };
    await expect(
      service.set('homologation', '20123456789', ticket),
    ).resolves.toBeUndefined();
  });
});
