import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  Optional,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';
import * as http from 'http';
import * as forge from 'node-forge';
import {
  ArcaAuthTicket,
  FiscalDocumentData,
  ArcaCaeResponse,
  ArcaFiscalDocument,
} from '@erp/shared-types';
import { IArcaService } from '../interfaces/arca-service.interface';
import { ArcaCertificateLoader } from './arca-certificate-loader.service';
import { ArcaClockSyncService } from './arca-clock-sync.service';
import { redactSecrets } from '../../../common/utils/sanitizer.utils';

export interface ArcaHomologationOptions {
  wsaaUrl?: string;
  cuit?: string;
  puntoVenta?: number;
}

@Injectable()
export class ArcaHomologationService implements IArcaService {
  private readonly logger = new Logger(ArcaHomologationService.name);
  private cachedTicket: ArcaAuthTicket | null = null;

  private readonly wsaaUrl: string;
  private readonly cuit: string;
  private readonly puntoVenta: number;

  constructor(
    private readonly certLoader: ArcaCertificateLoader,
    private readonly clockSyncService: ArcaClockSyncService,
    private readonly configService: ConfigService,
    @Optional()
    @Inject('ARCA_HOMOLOGATION_OPTIONS')
    options?: ArcaHomologationOptions,
  ) {
    this.wsaaUrl =
      options?.wsaaUrl ||
      this.configService.get<string>('ARCA_WSAA_URL')?.trim() ||
      'https://wsaahomo.afip.gov.ar/ws/services/LoginCms';

    this.cuit =
      options?.cuit ||
      this.configService.get<string>('ARCA_CUIT')?.trim() ||
      '';

    const pvRaw =
      options?.puntoVenta !== undefined
        ? options.puntoVenta
        : this.configService.get<number>('ARCA_PUNTO_VENTA');
    this.puntoVenta = Number(pvRaw);

    this.validateHomologationConfig();
  }

  /**
   * Enforces strict fail-fast validation for homologation parameters.
   */
  private validateHomologationConfig(): void {
    if (!this.cuit || !/^\d{11}$/.test(this.cuit)) {
      throw new Error(
        `[ARCA] ARCA_CUIT is required and must be an 11-digit numeric string in homologation mode. Provided: "${this.cuit}"`,
      );
    }

    if (
      !this.puntoVenta ||
      isNaN(this.puntoVenta) ||
      this.puntoVenta < 1 ||
      this.puntoVenta > 99999
    ) {
      throw new Error(
        `[ARCA] ARCA_PUNTO_VENTA is required and must be a valid point of sale (1-99999) in homologation mode. Provided: "${this.puntoVenta}"`,
      );
    }

    if (!this.wsaaUrl || !this.wsaaUrl.startsWith('https://')) {
      throw new Error(
        `[ARCA] ARCA_WSAA_URL must be a valid HTTPS URL in homologation mode. Provided: "${this.wsaaUrl}"`,
      );
    }
  }

  /**
   * Generates a WSAA TRA XML, signs it via PKCS#7 (CMS) with the certificate,
   * invokes WSAA LoginCms, parses the response, and caches the ticket.
   */
  async login(): Promise<ArcaAuthTicket> {
    const now = new Date();

    // Check cached ticket validity (reuse if more than 10 minutes remaining)
    if (this.cachedTicket) {
      const expDate = new Date(this.cachedTicket.expirationTime);
      if (expDate.getTime() - now.getTime() > 10 * 60 * 1000) {
        return this.cachedTicket;
      }
    }

    const certData = this.certLoader.loadCertificate();
    if (certData.isExpired) {
      throw new ServiceUnavailableException(
        `[ARCA] Certificate is expired (expired on ${certData.validTo.toISOString()}). Cannot authenticate with WSAA.`,
      );
    }

    // 1. Generate TRA XML
    const traXml = this.generateTraXml(now);

    // 2. Sign TRA with PKCS#7 / CMS DER format and Base64 encode
    const cmsBase64 = this.signTra(traXml, certData);

    // 3. Invoke WSAA LoginCms SOAP Service
    const soapResponseXml = await this.callWsaaLoginCms(cmsBase64);

    // 4. Parse LoginTicketResponse
    const ticket = this.parseLoginTicketResponse(soapResponseXml);

    this.cachedTicket = ticket;
    this.logger.log(
      `[ARCA WSAA] Authenticated successfully. Ticket valid until ${ticket.expirationTime}.`,
    );

    return ticket;
  }

  /**
   * Probe method for operational health diagnostics without issuing real fiscal documents.
   */
  async probeWsaaConnection(): Promise<{
    wsaaReachable: boolean;
    authenticated: boolean;
    ticketExpirationTime: string | null;
    clockSync: any;
    certificate: {
      subject: string;
      validTo: string;
      daysRemaining: number;
      isExpired: boolean;
    };
  }> {
    const certData = this.certLoader.loadCertificate();
    const clockSync = await this.clockSyncService.verifyClockSync(this.wsaaUrl);

    let authenticated = false;
    let ticketExpirationTime: string | null = null;
    let wsaaReachable = false;

    try {
      const ticket = await this.login();
      authenticated = true;
      wsaaReachable = true;
      ticketExpirationTime = ticket.expirationTime;
    } catch (err: unknown) {
      const sanitized = redactSecrets(
        err instanceof Error ? err.message : String(err),
      );
      this.logger.warn(`[ARCA WSAA Probe] Login probe failed: ${sanitized}`);
    }

    return {
      wsaaReachable,
      authenticated,
      ticketExpirationTime,
      clockSync,
      certificate: {
        subject: certData.subject,
        validTo: certData.validTo.toISOString(),
        daysRemaining: certData.daysRemaining,
        isExpired: certData.isExpired,
      },
    };
  }

  /**
   * Fail-closed: Real WSFE electronic invoice issuance is strictly reserved for Sprint 8.
   */
  async requestCAE(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _data: FiscalDocumentData,
  ): Promise<ArcaCaeResponse> {
    throw new ServiceUnavailableException(
      'El servicio de emisión fiscal electrónica (WSFE / requestCAE) está reservado para el Sprint 8. En homologación sólo está habilitada la autenticación y diagnóstico WSAA.',
    );
  }

  /**
   * Fail-closed: Real WSFE query is strictly reserved for Sprint 8.
   */
  async queryDocument(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _type: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _pointOfSale: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _documentNumber: number,
  ): Promise<ArcaFiscalDocument | null> {
    throw new ServiceUnavailableException(
      'El servicio de consulta de comprobantes fiscales (WSFE / queryDocument) está reservado para el Sprint 8.',
    );
  }

  private generateTraXml(now: Date): string {
    const generationTime = new Date(now.getTime() - 10 * 60 * 1000); // 10 minutes in the past
    const expirationTime = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes in the future
    const uniqueId = Math.floor(now.getTime() / 1000);

    return `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${uniqueId}</uniqueId>
    <generationTime>${generationTime.toISOString()}</generationTime>
    <expirationTime>${expirationTime.toISOString()}</expirationTime>
  </header>
  <service>wsfe</service>
</loginTicketRequest>`;
  }

  private signTra(
    traXml: string,
    certData: ReturnType<ArcaCertificateLoader['loadCertificate']>,
  ): string {
    const p7 = forge.pkcs7.createSignedData();
    p7.content = forge.util.createBuffer(traXml, 'utf8');
    p7.addCertificate(certData.certificate);
    p7.addSigner({
      key: certData.privateKey as any,
      certificate: certData.certificate,
      digestAlgorithm: forge.pki.oids.sha256,
      authenticatedAttributes: [
        {
          type: forge.pki.oids.contentType,
          value: forge.pki.oids.data,
        },
        {
          type: forge.pki.oids.messageDigest,
        },
        {
          type: forge.pki.oids.signingTime,
          value: new Date().toISOString(),
        },
      ],
    });

    p7.sign({ detached: false });
    const asn1 = p7.toAsn1();
    const derBytes = forge.asn1.toDer(asn1).getBytes();
    return forge.util.encode64(derBytes);
  }

  private callWsaaLoginCms(cmsBase64: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov">
  <soapenv:Header/>
  <soapenv:Body>
    <wsaa:loginCms>
      <wsaa:in0>${cmsBase64}</wsaa:in0>
    </wsaa:loginCms>
  </soapenv:Body>
</soapenv:Envelope>`;

      const url = new URL(this.wsaaUrl);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const req = client.request(
        this.wsaaUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            SOAPAction: '""',
            'Content-Length': Buffer.byteLength(soapEnvelope),
          },
          timeout: 10000,
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            if (
              res.statusCode &&
              res.statusCode >= 200 &&
              res.statusCode < 300
            ) {
              resolve(body);
            } else {
              const sanitizedError = redactSecrets(body);
              reject(
                new Error(
                  `WSAA LoginCms returned HTTP ${res.statusCode}: ${sanitizedError}`,
                ),
              );
            }
          });
        },
      );

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('WSAA LoginCms request timed out after 10000ms'));
      });

      req.on('error', (err) => {
        const sanitized = redactSecrets(err.message);
        reject(new Error(`WSAA network error: ${sanitized}`));
      });

      req.write(soapEnvelope);
      req.end();
    });
  }

  private parseLoginTicketResponse(soapXml: string): ArcaAuthTicket {
    // Unescape &lt; and &gt; if present inside loginCmsReturn
    const normalized = soapXml
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');

    const tokenMatch = normalized.match(/<token>([\s\S]*?)<\/token>/);
    const signMatch = normalized.match(/<sign>([\s\S]*?)<\/sign>/);
    const expirationMatch = normalized.match(
      /<expirationTime>([\s\S]*?)<\/expirationTime>/,
    );

    if (!tokenMatch || !signMatch || !expirationMatch) {
      const faultMatch = normalized.match(
        /<faultstring>([\s\S]*?)<\/faultstring>/,
      );
      if (faultMatch) {
        throw new Error(`AFIP WSAA Fault: ${faultMatch[1]}`);
      }
      throw new Error(
        'Failed to extract token, sign, or expirationTime from WSAA response.',
      );
    }

    return {
      token: tokenMatch[1].trim(),
      sign: signMatch[1].trim(),
      expirationTime: expirationMatch[1].trim(),
    };
  }
}
