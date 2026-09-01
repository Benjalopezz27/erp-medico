import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ArcaController } from './arca.controller';
import { ArcaService } from './arca.service';
import { ARCA_SERVICE } from './arca.constants';
import { ArcaCertificateLoader } from './services/arca-certificate-loader.service';
import { ArcaClockSyncService } from './services/arca-clock-sync.service';
import { ArcaDisabledService } from './arca-disabled.service';

describe('ArcaController', () => {
  let controller: ArcaController;
  let mockArcaService: jest.Mocked<ArcaService>;
  let mockCertLoader: jest.Mocked<ArcaCertificateLoader>;
  let mockClockSync: jest.Mocked<ArcaClockSyncService>;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    mockArcaService = {
      getStatus: jest
        .fn()
        .mockReturnValue({ module: 'arca', status: 'initialized' }),
    } as any;

    mockCertLoader = {
      loadCertificate: jest.fn().mockReturnValue({
        subject: 'CN=Test',
        validTo: new Date('2027-01-01'),
        daysRemaining: 120,
        isExpired: false,
      }),
    } as any;

    mockClockSync = {
      verifyClockSync: jest.fn().mockResolvedValue({
        isSynchronized: true,
        driftSeconds: 0,
      }),
    } as any;

    mockConfigService = {
      get: jest.fn().mockReturnValue('disabled'),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArcaController],
      providers: [
        { provide: ArcaService, useValue: mockArcaService },
        { provide: ARCA_SERVICE, useClass: ArcaDisabledService },
        { provide: ArcaCertificateLoader, useValue: mockCertLoader },
        { provide: ArcaClockSyncService, useValue: mockClockSync },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<ArcaController>(ArcaController);
  });

  it('returns module status with active environment', () => {
    const status = controller.getStatus();
    expect(status).toEqual({
      module: 'arca',
      status: 'initialized',
    });
  });

  it('returns sanitized probe data without sensitive credentials', async () => {
    const probe = await controller.getProbe();
    expect(probe.environment).toBe('disabled');
    expect(probe.certificate.hasCertificate).toBe(true);
    expect(probe.clockSync.isSynchronized).toBe(true);
    expect(probe.wsfeEmissionStatus).toBe('disabled_until_sprint_8');
  });
});
