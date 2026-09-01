import { ArcaClockSyncService } from './arca-clock-sync.service';

describe('ArcaClockSyncService', () => {
  let service: ArcaClockSyncService;

  beforeEach(() => {
    service = new ArcaClockSyncService();
  });

  it('detects clock synchronization when drift is small', async () => {
    const mockRemoteDate = new Date(Date.now() + 2000); // 2 seconds ahead
    jest
      .spyOn(service as any, 'fetchRemoteHttpDate')
      .mockResolvedValue(mockRemoteDate);

    const result = await service.verifyClockSync('https://example.com');
    expect(result.isSynchronized).toBe(true);
    expect(result.driftSeconds).toBeLessThanOrEqual(5);
    expect(result.warning).toBeUndefined();
  });

  it('flags warning when drift exceeds 60 seconds threshold', async () => {
    const mockRemoteDate = new Date(Date.now() + 120000); // 120 seconds ahead
    jest
      .spyOn(service as any, 'fetchRemoteHttpDate')
      .mockResolvedValue(mockRemoteDate);

    const result = await service.verifyClockSync('https://example.com');
    expect(result.isSynchronized).toBe(false);
    expect(result.driftSeconds).toBeGreaterThanOrEqual(60);
    expect(result.warning).toContain('Clock drift');
  });

  it('gracefully falls back when remote reference is unreachable', async () => {
    jest
      .spyOn(service as any, 'fetchRemoteHttpDate')
      .mockRejectedValue(new Error('DNS resolution failed'));

    const result = await service.verifyClockSync(
      'https://unreachable.afip.gov.ar',
    );
    expect(result.referenceSource).toBe('local_fallback');
    expect(result.isSynchronized).toBe(true);
    expect(result.warning).toContain('Could not reach time reference');
  });
});
