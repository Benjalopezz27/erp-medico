import { Injectable, BadRequestException } from '@nestjs/common';
import {
  ArcaAuthTicket,
  FiscalDocumentData,
  ArcaCaeResponse,
  ArcaFiscalDocument,
} from '@erp/shared-types';
import { IArcaService } from './interfaces/arca-service.interface';
import { validateFiscalAmounts } from './utils/fiscal-amounts.util';

export interface ArcaMockOptions {
  latencyMs?: number;
  now?: () => Date;
}

@Injectable()
export class ArcaMockService implements IArcaService {
  private readonly latencyMs: number;
  private readonly now: () => Date;

  constructor(options?: ArcaMockOptions) {
    const nodeEnv = process.env.NODE_ENV?.trim().toLowerCase();
    const arcaEnv = process.env.ARCA_ENV?.trim().toLowerCase();

    if (
      nodeEnv === 'production' ||
      arcaEnv === 'production' ||
      arcaEnv === 'homologation'
    ) {
      throw new Error(
        `[SECURITY] ArcaMockService is strictly prohibited in production or homologation environments (NODE_ENV=${nodeEnv}, ARCA_ENV=${arcaEnv}).`,
      );
    }
    this.latencyMs = options?.latencyMs ?? 200;
    this.now = options?.now ?? (() => new Date());
  }

  async login(): Promise<ArcaAuthTicket> {
    const current = this.now();
    const expiration = new Date(
      current.getTime() + 12 * 60 * 60 * 1000,
    ).toISOString();

    return {
      token: 'mock-wsaa-token-xyz-1234567890',
      sign: 'mock-wsaa-sign-abc-1234567890',
      expirationTime: expiration,
    };
  }

  async requestCAE(data: FiscalDocumentData): Promise<ArcaCaeResponse> {
    if (!data) {
      throw new BadRequestException('Fiscal document data is required.');
    }
    if (!Number.isInteger(data.pointOfSale) || data.pointOfSale <= 0) {
      throw new BadRequestException(
        'Point of sale must be a positive integer.',
      );
    }
    if (!Number.isInteger(data.documentNumber) || data.documentNumber <= 0) {
      throw new BadRequestException(
        'Document number must be a positive integer.',
      );
    }
    if (
      typeof data.totalAmount !== 'number' ||
      isNaN(data.totalAmount) ||
      data.totalAmount < 0
    ) {
      throw new BadRequestException(
        'Total amount must be a non-negative number.',
      );
    }
    validateFiscalAmounts(data);

    if (this.latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.latencyMs));
    }

    const current = this.now();
    const expDate = new Date(current.getTime() + 10 * 24 * 60 * 60 * 1000);
    const yyyy = expDate.getFullYear();
    const mm = String(expDate.getMonth() + 1).padStart(2, '0');
    const dd = String(expDate.getDate()).padStart(2, '0');

    return {
      cae: '99999999999999',
      caeExpiration: `${yyyy}${mm}${dd}`,
    };
  }

  async queryDocument(
    type: number,
    pointOfSale: number,
    documentNumber: number,
  ): Promise<ArcaFiscalDocument | null> {
    if (!Number.isInteger(type) || type <= 0) {
      throw new BadRequestException(
        'Document type must be a positive integer.',
      );
    }
    if (!Number.isInteger(pointOfSale) || pointOfSale <= 0) {
      throw new BadRequestException(
        'Point of sale must be a positive integer.',
      );
    }
    if (!Number.isInteger(documentNumber) || documentNumber <= 0) {
      throw new BadRequestException(
        'Document number must be a positive integer.',
      );
    }

    // Deterministic mock behavior: simulates document not found
    return null;
  }
}
