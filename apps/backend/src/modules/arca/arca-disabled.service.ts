import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  ArcaAuthTicket,
  FiscalDocumentData,
  ArcaCaeResponse,
  ArcaFiscalDocument,
} from '@erp/shared-types';
import { IArcaService } from './interfaces/arca-service.interface';

@Injectable()
export class ArcaDisabledService implements IArcaService {
  private static readonly DISABLED_MESSAGE =
    'El servicio de facturación electrónica ARCA está deshabilitado en este entorno (integración pendiente para Sprint 8).';

  async login(): Promise<ArcaAuthTicket> {
    throw new ServiceUnavailableException(ArcaDisabledService.DISABLED_MESSAGE);
  }

  async requestCAE(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _data: FiscalDocumentData,
  ): Promise<ArcaCaeResponse> {
    throw new ServiceUnavailableException(ArcaDisabledService.DISABLED_MESSAGE);
  }

  async queryDocument(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _type: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _pointOfSale: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _documentNumber: number,
  ): Promise<ArcaFiscalDocument | null> {
    throw new ServiceUnavailableException(ArcaDisabledService.DISABLED_MESSAGE);
  }
}
