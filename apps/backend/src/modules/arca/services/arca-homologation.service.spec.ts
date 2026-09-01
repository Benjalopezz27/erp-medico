import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import * as forge from 'node-forge';
import { ArcaHomologationService } from './arca-homologation.service';
import { ArcaCertificateLoader } from './arca-certificate-loader.service';
import { ArcaClockSyncService } from './arca-clock-sync.service';

function createMockCertData() {
  const keys = forge.pki.rsa.generateKeyPair(1024);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date(Date.now() + 300 * 24 * 60 * 60 * 1000);

  const attrs = [{ name: 'commonName', value: 'AFIP Homologation Test' }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());

  return {
    certificate: cert,
    privateKey: keys.privateKey,
    certificatePem: forge.pki.certificateToPem(cert),
    privateKeyPem: forge.pki.privateKeyToPem(keys.privateKey),
    subject: 'CN=AFIP Homologation Test',
    issuer: 'CN=AFIP Homologation Test',
    validFrom: cert.validity.notBefore,
    validTo: cert.validity.notAfter,
    daysRemaining: 300,
    isExpired: false,
  };
}

describe('ArcaHomologationService', () => {
  let mockCertLoader: jest.Mocked<ArcaCertificateLoader>;
  let mockClockSync: jest.Mocked<ArcaClockSyncService>;
  let mockConfigService: jest.Mocked<ConfigService>;
  let service: ArcaHomologationService;

  beforeEach(() => {
    mockCertLoader = {
      loadCertificate: jest.fn().mockReturnValue(createMockCertData()),
    } as any;

    mockClockSync = {
      verifyClockSync: jest.fn().mockResolvedValue({
        localTimeIso: new Date().toISOString(),
        referenceTimeIso: new Date().toISOString(),
        driftSeconds: 0,
        isSynchronized: true,
        referenceSource: 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms',
      }),
    } as any;

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'ARCA_WSAA_URL')
          return 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms';
        if (key === 'ARCA_CUIT') return '20123456789';
        if (key === 'ARCA_PUNTO_VENTA') return 1;
        return undefined;
      }),
    } as any;

    service = new ArcaHomologationService(
      mockCertLoader,
      mockClockSync,
      mockConfigService,
    );
  });

  it('keeps requestCAE fail-closed until Sprint 8', async () => {
    await expect(
      service.requestCAE({
        pointOfSale: 1,
        documentNumber: 1,
        totalAmount: 100,
      } as any),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('keeps queryDocument fail-closed until Sprint 8', async () => {
    await expect(service.queryDocument(1, 1, 1)).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('probeWsaaConnection handles failed network connection safely without crashing', async () => {
    // Mock callWsaaLoginCms failure
    jest
      .spyOn(service as any, 'callWsaaLoginCms')
      .mockRejectedValue(new Error('Connection refused'));

    const probe = await service.probeWsaaConnection();
    expect(probe.authenticated).toBe(false);
    expect(probe.wsaaReachable).toBe(false);
    expect(probe.certificate.subject).toContain('AFIP Homologation Test');
    expect(probe.clockSync.isSynchronized).toBe(true);
  });

  it('authenticates and parses WSAA SOAP XML response successfully', async () => {
    const mockSoapXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <loginCmsResponse xmlns="http://wsaa.view.sua.dvadac.desein.afip.gov">
      <loginCmsReturn>&lt;?xml version="1.0" encoding="UTF-8"?&gt;
&lt;loginTicketResponse version="1.0"&gt;
  &lt;header&gt;
    &lt;source&gt;CN=wsaahomo&lt;/source&gt;
    &lt;destination&gt;CN=homo_client&lt;/destination&gt;
    &lt;uniqueId&gt;123456789&lt;/uniqueId&gt;
    &lt;generationTime&gt;2026-09-01T12:00:00-03:00&lt;/generationTime&gt;
    &lt;expirationTime&gt;2026-09-01T23:59:59-03:00&lt;/expirationTime&gt;
  &lt;/header&gt;
  &lt;credentials&gt;
    &lt;token&gt;real_homo_wsaa_token_xyz&lt;/token&gt;
    &lt;sign&gt;real_homo_wsaa_sign_abc&lt;/sign&gt;
  &lt;/credentials&gt;
&lt;/loginTicketResponse&gt;
      </loginCmsReturn>
    </loginCmsResponse>
  </soapenv:Body>
</soapenv:Envelope>`;

    jest
      .spyOn(service as any, 'callWsaaLoginCms')
      .mockResolvedValue(mockSoapXml);

    const ticket = await service.login();
    expect(ticket.token).toBe('real_homo_wsaa_token_xyz');
    expect(ticket.sign).toBe('real_homo_wsaa_sign_abc');
    expect(ticket.expirationTime).toBe('2026-09-01T23:59:59-03:00');

    // Second call reuses cached ticket
    const ticket2 = await service.login();
    expect(ticket2.token).toBe('real_homo_wsaa_token_xyz');
  });
});
