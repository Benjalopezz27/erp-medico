import { ConflictException, Logger } from '@nestjs/common';
import * as QRCode from 'qrcode';
import {
  ArcaStatus,
  PdfArtifactStatus,
  SalesErrorCode,
} from '@erp/shared-types';
import { FiscalDocument } from '../entities/fiscal-document.entity';
import { PdfGenerateQueueService } from '../../queue/services/pdf-generate.queue';

/** Shared by SalesService (Factura/NC own document) and SaleReturnsService
 * (Nota de Crédito document) so both endpoints agree on the same
 * availability rules, filename shape and recovery behavior. */

export function assertPdfAvailable(document: FiscalDocument): void {
  if (
    document.arcaStatus !== ArcaStatus.EMITIDO ||
    document.pdfStatus !== PdfArtifactStatus.DISPONIBLE ||
    !document.pdfData
  ) {
    throw new ConflictException({
      code: SalesErrorCode.SALE_FISCAL_ARTIFACT_NOT_AVAILABLE,
      message: 'El PDF del comprobante todavía no está disponible.',
      pdfStatus: document.pdfStatus,
    });
  }
}

export function assertQrAvailable(document: FiscalDocument): void {
  if (document.arcaStatus !== ArcaStatus.EMITIDO || !document.qrCodeData) {
    throw new ConflictException({
      code: SalesErrorCode.SALE_FISCAL_ARTIFACT_NOT_AVAILABLE,
      message: 'El QR del comprobante todavía no está disponible.',
      pdfStatus: document.pdfStatus,
    });
  }
}

export function buildArtifactFilename(
  document: FiscalDocument,
  extension: string,
): string {
  const type = (document.documentType ?? 'comprobante')
    .toLowerCase()
    .replace(/_/g, '-');
  const pointOfSale = String(document.pointOfSale ?? 0).padStart(5, '0');
  const number = String(document.documentNumber ?? 0).padStart(8, '0');
  return `${type}-${pointOfSale}-${number}.${extension}`;
}

export function renderQrPng(document: FiscalDocument): Promise<Buffer> {
  return QRCode.toBuffer(document.qrCodeData!, {
    errorCorrectionLevel: 'M',
    margin: 1,
  });
}

/** Best-effort: a 409 on download re-triggers its own recovery instead of
 * requiring a separate administrative retry endpoint. The deterministic
 * jobId on PdfGenerateQueueService means this never creates a duplicate job
 * if one is already pending. Never blocks or fails the download response —
 * only EMITIDO documents are worth retrying (no CAE yet means nothing to
 * render). */
export function tryRecoverPdfGeneration(
  document: FiscalDocument,
  pdfGenerateQueueService: PdfGenerateQueueService,
  logger: Logger,
): void {
  if (document.arcaStatus !== ArcaStatus.EMITIDO) return;
  if (document.pdfStatus === PdfArtifactStatus.DISPONIBLE) return;
  pdfGenerateQueueService
    .enqueue({ fiscalDocumentId: document.id })
    .catch((enqueueError) => {
      logger.warn(
        `No se pudo reencolar la generación de PDF/QR del documento ${document.id}. ${
          enqueueError instanceof Error
            ? enqueueError.message
            : String(enqueueError)
        }`,
      );
    });
}
