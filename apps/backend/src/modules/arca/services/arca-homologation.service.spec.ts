import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import * as forge from 'node-forge';
import { ArcaHomologationService } from './arca-homologation.service';
import {
  ArcaCertificateLoader,
  ArcaCertificateData,
} from './arca-certificate-loader.service';
import { ArcaClockSyncService } from './arca-clock-sync.service';

describe('ArcaHomologationService', () => {
  let service: ArcaHomologationService;
  let mockCertLoader: Partial<ArcaCertificateLoader>;
  let mockClockSync: Partial<ArcaClockSyncService>;
  let mockConfig: Record<string, any>;

  const mockKeys = forge.pki.rsa.generateKeyPair(1024);
  const mockCert = forge.pki.createCertificate();
  mockCert.publicKey = mockKeys.publicKey;
  mockCert.serialNumber = '01';
  mockCert.validity.notBefore = new Date(Date.now() - 1000 * 60 * 60 * 24);
  mockCert.validity.notAfter = new Date(Date.now() + 1000 * 60 * 60 * 24 * 300);
  mockCert.setSubject([
    { name: 'commonName', value: 'Homologacion AFIP Test' },
  ]);
  mockCert.setIssuer([{ name: 'commonName', value: 'Homologacion AFIP Test' }]);
  mockCert.sign(mockKeys.privateKey);

  const validCertData: ArcaCertificateData = {
    certificate: mockCert,
    privateKey: mockKeys.privateKey,
    subject: 'CN=Homologacion AFIP Test',
    issuer: 'CN=Homologacion AFIP Test',
    validFrom: mockCert.validity.notBefore,
    validTo: mockCert.validity.notAfter,
    daysRemaining: 300,
    isExpired: false,
  };

  beforeEach(async () => {
    mockConfig = {
      ARCA_CUIT: '20123456789',
      ARCA_PUNTO_VENTA: 1,
      ARCA_WSAA_URL: 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms',
    };

    mockCertLoader = {
      loadCertificate: jest.fn().mockReturnValue(validCertData),
    };

    mockClockSync = {
      verifyClockSync: jest.fn().mockResolvedValue({
        localTimeIso: new Date().toISOString(),
        referenceTimeIso: new Date().toISOString(),
        driftSeconds: 0,
        isSynchronized: true,
        status: 'synchronized',
        referenceSource: 'https://wsaahomo.afip.gov.ar',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArcaHomologationService,
        { provide: ArcaCertificateLoader, useValue: mockCertLoader },
        { provide: ArcaClockSyncService, useValue: mockClockSync },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key]),
          },
        },
      ],
    }).compile();

    service = module.get<ArcaHomologationService>(ArcaHomologationService);
  });

  describe('Strict Configuration Validation', () => {
    it('should throw if ARCA_CUIT is missing or not 11 digits', () => {
      expect(
        () =>
          new ArcaHomologationService(
            mockCertLoader as ArcaCertificateLoader,
            mockClockSync as ArcaClockSyncService,
            { get: () => undefined } as any,
            { cuit: '123' },
          ),
      ).toThrow(/ARCA_CUIT is required and must be an 11-digit numeric string/);
    });

    it('should throw if ARCA_PUNTO_VENTA is invalid or missing', () => {
      expect(
        () =>
          new ArcaHomologationService(
            mockCertLoader as ArcaCertificateLoader,
            mockClockSync as ArcaClockSyncService,
            { get: () => undefined } as any,
            { cuit: '20123456789', puntoVenta: 0 },
          ),
      ).toThrow(
        /ARCA_PUNTO_VENTA is required and must be a valid point of sale/,
      );
    });

    it('should throw if ARCA_WSAA_URL is not HTTPS', () => {
      expect(
        () =>
          new ArcaHomologationService(
            mockCertLoader as ArcaCertificateLoader,
            mockClockSync as ArcaClockSyncService,
            { get: () => undefined } as any,
            {
              cuit: '20123456789',
              puntoVenta: 1,
              wsaaUrl: 'http://insecure.afip.gov.ar',
            },
          ),
      ).toThrow(/ARCA_WSAA_URL must be a valid HTTPS URL/);
    });
  });

  describe('WSAA Login & Token Handling', () => {
    it('should parse valid LoginCms response and return ticket', async () => {
      const mockSoapXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <loginCmsResponse xmlns="http://wsaa.view.sua.dvadac.desein.afip.gov">
      <loginCmsReturn>&lt;loginTicketResponse version="1.0"&gt;
        &lt;header&gt;
          &lt;expirationTime&gt;2026-09-01T23:59:59-03:00&lt;/expirationTime&gt;
        &lt;/header&gt;
        &lt;credentials&gt;
          &lt;token&gt;test_token_value_abc&lt;/token&gt;
          &lt;sign&gt;test_sign_value_xyz&lt;/sign&gt;
        &lt;/credentials&gt;
      &lt;/loginTicketResponse&gt;</loginCmsReturn>
    </loginCmsResponse>
  </soapenv:Body>
</soapenv:Envelope>`;

      jest
        .spyOn(service as any, 'callWsaaLoginCms')
        .mockResolvedValue(mockSoapXml);

      const ticket = await service.login();
      expect(ticket.token).toBe('test_token_value_abc');
      expect(ticket.sign).toBe('test_sign_value_xyz');
      expect(ticket.expirationTime).toBe('2026-09-01T23:59:59-03:00');
    });

    it('should throw ServiceUnavailableException if certificate is expired', async () => {
      jest.spyOn(mockCertLoader, 'loadCertificate').mockReturnValue({
        ...validCertData,
        isExpired: true,
        validTo: new Date(Date.now() - 10000),
      });

      await expect(service.login()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe('Fail-Closed Sprint 8 Boundaries', () => {
    it('should throw ServiceUnavailableException for requestCAE (deferred to Sprint 8)', async () => {
      await expect(service.requestCAE({} as any)).rejects.toThrow(/Sprint 8/);
    });

    it('should throw ServiceUnavailableException for queryDocument (deferred to Sprint 8)', async () => {
      await expect(service.queryDocument(1, 1, 1)).rejects.toThrow(/Sprint 8/);
    });
  });

  describe('probeWsaaConnection', () => {
    it('should report probe results gracefully even if WSAA login fails', async () => {
      jest
        .spyOn(service, 'login')
        .mockRejectedValue(new Error('Connection refused'));

      const probe = await service.probeWsaaConnection();
      expect(probe.authenticated).toBe(false);
      expect(probe.wsaaReachable).toBe(false);
      expect(probe.certificate.subject).toContain('Homologacion AFIP Test');
      expect(probe.clockSync.isSynchronized).toBe(true);
    });
  });
});
