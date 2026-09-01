import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as forge from 'node-forge';

export interface ArcaCertificateData {
  certificate: forge.pki.Certificate;
  privateKey: forge.pki.PrivateKey;
  certificatePem: string;
  privateKeyPem: string;
  subject: string;
  issuer: string;
  validFrom: Date;
  validTo: Date;
  daysRemaining: number;
  isExpired: boolean;
}

@Injectable()
export class ArcaCertificateLoader {
  private readonly logger = new Logger(ArcaCertificateLoader.name);
  private cachedCertData: ArcaCertificateData | null = null;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Loads and parses the X.509 PKCS#12 certificate from memory (ARCA_CERT_BASE64)
   * or runtime file path (ARCA_CERT_PATH). Never writes keys to persistent disk.
   */
  loadCertificate(): ArcaCertificateData {
    if (this.cachedCertData && !this.cachedCertData.isExpired) {
      return this.cachedCertData;
    }

    const certBase64 = this.configService
      .get<string>('ARCA_CERT_BASE64')
      ?.trim();
    const certPath = this.configService.get<string>('ARCA_CERT_PATH')?.trim();
    const certPassword =
      this.configService.get<string>('ARCA_CERT_PASSWORD') || '';

    let p12DerBuffer: string | null = null;

    if (certBase64) {
      try {
        p12DerBuffer = forge.util.decode64(certBase64);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`[ARCA] Failed to decode ARCA_CERT_BASE64: ${message}`);
      }
    } else if (certPath) {
      if (!fs.existsSync(certPath)) {
        throw new Error(
          `[ARCA] Certificate file not found at path: ${certPath}`,
        );
      }
      try {
        const fileBytes = fs.readFileSync(certPath);
        p12DerBuffer = forge.util
          .createBuffer(fileBytes.toString('binary'))
          .getBytes();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(
          `[ARCA] Failed to read certificate file at ${certPath}: ${message}`,
        );
      }
    } else {
      throw new Error(
        '[ARCA] Missing certificate configuration. Set ARCA_CERT_BASE64 (sealed variable) or ARCA_CERT_PATH.',
      );
    }

    try {
      const p12Asn1 = forge.asn1.fromDer(p12DerBuffer);
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, certPassword);

      // Extract certificate
      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const certBag = certBags[forge.pki.oids.certBag]?.[0];
      if (!certBag || !certBag.cert) {
        throw new Error('No X.509 certificate found inside PKCS#12 container.');
      }
      const cert = certBag.cert;

      // Extract private key
      const keyBags = p12.getBags({
        bagType: forge.pki.oids.pkcs8ShroudedKeyBag,
      });
      const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
      if (!keyBag || !keyBag.key) {
        throw new Error('No private key found inside PKCS#12 container.');
      }
      const privateKey = keyBag.key;

      const validFrom = cert.validity.notBefore;
      const validTo = cert.validity.notAfter;
      const now = new Date();
      const msRemaining = validTo.getTime() - now.getTime();
      const daysRemaining = Math.floor(msRemaining / (1000 * 60 * 60 * 24));
      const isExpired = msRemaining <= 0;

      const subject = cert.subject.attributes
        .map((attr) => `${attr.shortName || attr.name}=${attr.value}`)
        .join(', ');
      const issuer = cert.issuer.attributes
        .map((attr) => `${attr.shortName || attr.name}=${attr.value}`)
        .join(', ');

      if (isExpired) {
        this.logger.error(
          `[ARCA] Certificate is EXPIRED since ${validTo.toISOString()}. Subject: ${subject}`,
        );
      } else if (daysRemaining < 30) {
        this.logger.warn(
          `[ARCA] Certificate will EXPIRE soon in ${daysRemaining} days (on ${validTo.toISOString()}). Subject: ${subject}`,
        );
      } else {
        this.logger.log(
          `[ARCA] Certificate loaded successfully. Subject: ${subject}, Valid until: ${validTo.toISOString()} (${daysRemaining} days remaining)`,
        );
      }

      this.cachedCertData = {
        certificate: cert,
        privateKey,
        certificatePem: forge.pki.certificateToPem(cert),
        privateKeyPem: forge.pki.privateKeyToPem(privateKey),
        subject,
        issuer,
        validFrom,
        validTo,
        daysRemaining,
        isExpired,
      };

      return this.cachedCertData;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('Invalid password') || message.includes('PKCS#12')) {
        throw new Error(
          '[ARCA] Invalid PKCS#12 certificate password or corrupt certificate container.',
        );
      }
      throw new Error(`[ARCA] Failed to parse PKCS#12 certificate: ${message}`);
    }
  }
}
