import { Test, TestingModule } from '@nestjs/testing';
import { ArcaClockSyncService } from './arca-clock-sync.service';

describe('ArcaClockSyncService', () => {
  let service: ArcaClockSyncService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ArcaClockSyncService],
    }).compile();

    service = module.get<ArcaClockSyncService>(ArcaClockSyncService);
  });

  it('should return synchronized true when remote time is within 60 seconds', async () => {
    const now = new Date();
    jest.spyOn(service as any, 'fetchRemoteHttpDate').mockResolvedValue(now);

    const result = await service.verifyClockSync(
      'https://wsaahomo.afip.gov.ar/test',
    );
    expect(result.isSynchronized).toBe(true);
    expect(result.status).toBe('synchronized');
    expect(result.driftSeconds).toBe(0);
    expect(result.referenceTimeIso).toBe(now.toISOString());
  });

  it('should detect clock drift > 60 seconds and set status drift_exceeded', async () => {
    const remoteTime = new Date(Date.now() - 120 * 1000); // 120 seconds ago
    jest
      .spyOn(service as any, 'fetchRemoteHttpDate')
      .mockResolvedValue(remoteTime);

    const result = await service.verifyClockSync(
      'https://wsaahomo.afip.gov.ar/test',
    );
    expect(result.isSynchronized).toBe(false);
    expect(result.status).toBe('drift_exceeded');
    expect(result.driftSeconds).toBe(120);
    expect(result.warning).toContain(
      'Clock drift (120s) exceeds maximum allowed threshold of 60s',
    );
  });

  it('should return unreachable status and isSynchronized: false if remote server is unreachable', async () => {
    jest
      .spyOn(service as any, 'fetchRemoteHttpDate')
      .mockRejectedValue(new Error('DNS resolution failed'));

    const result = await service.verifyClockSync(
      'https://unreachable.afip.gov.ar',
    );
    expect(result.isSynchronized).toBe(false);
    expect(result.status).toBe('unreachable');
    expect(result.referenceTimeIso).toBeNull();
    expect(result.driftSeconds).toBeNull();
    expect(result.warning).toContain('DNS resolution failed');
  });
});
