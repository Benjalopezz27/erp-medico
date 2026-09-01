import { ConfigService } from '@nestjs/config';
import { arcaServiceProvider } from './arca.provider';
import { ArcaMockService } from './arca-mock.service';
import { ArcaDisabledService } from './arca-disabled.service';
import { ArcaHomologationService } from './services/arca-homologation.service';
import { ArcaCertificateLoader } from './services/arca-certificate-loader.service';
import { ArcaClockSyncService } from './services/arca-clock-sync.service';

describe('arcaServiceProvider', () => {
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockCertLoader: jest.Mocked<ArcaCertificateLoader>;
  let mockClockSync: jest.Mocked<ArcaClockSyncService>;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn(),
    } as any;
    mockCertLoader = {
      loadCertificate: jest.fn(),
    } as any;
    mockClockSync = {
      verifyClockSync: jest.fn(),
    } as any;
  });

  const getService = () => {
    const factory = (arcaServiceProvider as any).useFactory;
    return factory(mockConfigService, mockCertLoader, mockClockSync);
  };

  it('returns ArcaDisabledService when ARCA_ENV=disabled', () => {
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'ARCA_ENV') return 'disabled';
      if (key === 'NODE_ENV') return 'production';
      return undefined;
    });

    const service = getService();
    expect(service).toBeInstanceOf(ArcaDisabledService);
  });

  it('returns ArcaMockService when ARCA_ENV=development and NODE_ENV=development', () => {
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'ARCA_ENV') return 'development';
      if (key === 'NODE_ENV') return 'development';
      return undefined;
    });

    const service = getService();
    expect(service).toBeInstanceOf(ArcaMockService);
  });

  it('throws security error if ARCA_ENV=development in NODE_ENV=production', () => {
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'ARCA_ENV') return 'development';
      if (key === 'NODE_ENV') return 'production';
      return undefined;
    });

    expect(() => getService()).toThrow(
      /strictly prohibited in production mode/i,
    );
  });

  it('returns ArcaHomologationService when ARCA_ENV=homologation', () => {
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'ARCA_ENV') return 'homologation';
      if (key === 'NODE_ENV') return 'test';
      if (key === 'ARCA_CUIT') return '20123456789';
      if (key === 'ARCA_PUNTO_VENTA') return 1;
      if (key === 'ARCA_WSAA_URL') return 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms';
      return undefined;
    });

    const service = getService();
    expect(service).toBeInstanceOf(ArcaHomologationService);
  });

  it('throws fatal error when ARCA_ENV=production (until Sprint 8)', () => {
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'ARCA_ENV') return 'production';
      if (key === 'NODE_ENV') return 'production';
      return undefined;
    });

    expect(() => getService()).toThrow(/pending Sprint 8/i);
  });
});
