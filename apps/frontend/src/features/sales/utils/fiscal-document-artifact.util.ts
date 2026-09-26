import type { IFiscalDocument } from '@erp/shared-types';

/** Mirrors the backend's Content-Disposition filename (SalesController) —
 * needed client-side too because a blob URL download has no header to read
 * the name from. */
export function buildFiscalDocumentFilename(
  document: Pick<IFiscalDocument, 'documentType' | 'pointOfSale' | 'documentNumber'>,
  extension: 'pdf',
): string {
  const type = (document.documentType ?? 'comprobante').toLowerCase().replace(/_/g, '-');
  const pointOfSale = String(document.pointOfSale ?? 0).padStart(5, '0');
  const number = String(document.documentNumber ?? 0).padStart(8, '0');
  return `${type}-${pointOfSale}-${number}.${extension}`;
}
