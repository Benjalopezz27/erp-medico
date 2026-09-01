import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as forge from 'node-forge';
import { ArcaCertificateLoader } from './arca-certificate-loader.service';

function generateMockP12Base64(password: string, expired = false): string {
  const keys = forge.pki.rsa.generateKeyPair(1024);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date(Date.now() - 1000 * 60 * 60 * 24 * 10);
  cert.validity.notAfter = expired
    ? new Date(Date.now() - 1000 * 60 * 60 * 24 * 5)
    : new Date(Date.now() + 1000 * 60 * 60 * 24 * 300);

  const attrs = [
    { name: 'commonName', value: 'Homologacion AFIP Test' },
    { name: 'countryName', value: 'AR' },
    { shortName: 'OU', value: 'Testing' },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey);

  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], password);
  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
  return forge.util.encode64(p12Der);
}

describe('ArcaCertificateLoader', () => {
  let loader: ArcaCertificateLoader;
  let mockConfig: Record<string, any>;

  const validPassword = 'secure_test_password';

  beforeEach(async () => {
    mockConfig = {};
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArcaCertificateLoader,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key]),
          },
        },
      ],
    }).compile();

    loader = module.get<ArcaCertificateLoader>(ArcaCertificateLoader);
  });

  it('should throw error if neither ARCA_CERT_BASE64 nor ARCA_CERT_PATH is provided', () => {
    expect(() => loader.loadCertificate()).toThrow(
      /Missing certificate configuration/,
    );
  });

  it('should throw error if certificate password is wrong', () => {
    mockConfig['ARCA_CERT_BASE64'] = generateMockP12Base64(validPassword);
    mockConfig['ARCA_CERT_PASSWORD'] = 'wrong_password';

    expect(() => loader.loadCertificate()).toThrow(
      /Invalid PKCS#12 certificate password/,
    );
  });

  it('should parse valid PKCS#12 base64 and extract certificate details without privateKeyPem', () => {
    mockConfig['ARCA_CERT_BASE64'] = generateMockP12Base64(validPassword);
    mockConfig['ARCA_CERT_PASSWORD'] = validPassword;

    const data = loader.loadCertificate();
    expect(data.subject).toContain('Homologacion AFIP Test');
    expect(data.isExpired).toBe(false);
    expect(data.daysRemaining).toBeGreaterThan(250);
    expect(data.certificate).toBeDefined();
    expect(data.privateKey).toBeDefined();
    expect((data as any).privateKeyPem).toBeUndefined();
  });

  it('should flag expired certificate correctly', () => {
    mockConfig['ARCA_CERT_BASE64'] = generateMockP12Base64(validPassword, true);
    mockConfig['ARCA_CERT_PASSWORD'] = validPassword;

    const data = loader.loadCertificate();
    expect(data.isExpired).toBe(true);
    expect(data.daysRemaining).toBeLessThan(0);
  });
});
