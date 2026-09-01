import { ConfigService } from '@nestjs/config';
import * as forge from 'node-forge';
import { ArcaCertificateLoader } from './arca-certificate-loader.service';

/**
 * Generates a self-signed PKCS#12 bundle in Base64 for isolated unit testing.
 */
function createTestP12Base64(password: string, daysValid = 365): string {
  const keys = forge.pki.rsa.generateKeyPair(1024);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date(
    Date.now() + daysValid * 24 * 60 * 60 * 1000,
  );

  const attrs = [
    { name: 'commonName', value: 'Homologacion AFIP Test' },
    { name: 'countryName', value: 'AR' },
    { shortName: 'OU', value: 'Testing' },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());

  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], password, {
    generateLocalKeyId: true,
    friendlyName: 'TestCert',
  });
  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
  return forge.util.encode64(p12Der);
}

describe('ArcaCertificateLoader', () => {
  let mockConfigService: jest.Mocked<ConfigService>;
  let loader: ArcaCertificateLoader;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn(),
    } as any;
    loader = new ArcaCertificateLoader(mockConfigService);
  });

  it('successfully loads and parses a valid Base64 PKCS#12 certificate', () => {
    const validP12Base64 = createTestP12Base64('test-password-123', 300);
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'ARCA_CERT_BASE64') return validP12Base64;
      if (key === 'ARCA_CERT_PASSWORD') return 'test-password-123';
      return undefined;
    });

    const certData = loader.loadCertificate();
    expect(certData).toBeDefined();
    expect(certData.subject).toContain('Homologacion AFIP Test');
    expect(certData.daysRemaining).toBeGreaterThanOrEqual(299);
    expect(certData.isExpired).toBe(false);
    expect(certData.certificatePem).toContain('BEGIN CERTIFICATE');
  });

  it('detects expired certificates correctly', () => {
    const expiredP12Base64 = createTestP12Base64('test-password-123', -5);
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'ARCA_CERT_BASE64') return expiredP12Base64;
      if (key === 'ARCA_CERT_PASSWORD') return 'test-password-123';
      return undefined;
    });

    const certData = loader.loadCertificate();
    expect(certData.isExpired).toBe(true);
    expect(certData.daysRemaining).toBeLessThan(0);
  });

  it('throws a sanitized error when the password is incorrect', () => {
    const validP12Base64 = createTestP12Base64('correct-password', 100);
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'ARCA_CERT_BASE64') return validP12Base64;
      if (key === 'ARCA_CERT_PASSWORD') return 'WRONG-password';
      return undefined;
    });

    expect(() => loader.loadCertificate()).toThrow(
      /Invalid PKCS#12 certificate password/i,
    );
  });

  it('throws descriptive error when no certificate is configured', () => {
    mockConfigService.get.mockReturnValue(undefined);

    expect(() => loader.loadCertificate()).toThrow(
      /Missing certificate configuration/i,
    );
  });
});
