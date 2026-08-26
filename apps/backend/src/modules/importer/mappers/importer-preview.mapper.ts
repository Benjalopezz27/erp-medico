import {
  IImporterPreviewResponse,
  IImporterPreviewSummary,
  IImporterValidRow,
  IImporterUnknownRow,
  IImporterErrorRow,
  IImporterSupplierSummary,
} from '@erp/shared-types';
import { Supplier } from '../../suppliers/entities/supplier.entity';

export function toImporterSupplierSummary(
  supplier: Supplier,
): IImporterSupplierSummary {
  return {
    id: supplier.id,
    businessName: supplier.businessName,
    cuit: supplier.cuit,
  };
}

export function toImporterPreviewResponse(params: {
  supplier: Supplier;
  fileChecksum: string;
  headerFingerprint: string;
  mappingChecksum: string;
  contentChecksum: string;
  summary: IImporterPreviewSummary;
  validRows: IImporterValidRow[];
  unknownRows: IImporterUnknownRow[];
  errorRows: IImporterErrorRow[];
}): IImporterPreviewResponse {
  return {
    supplier: toImporterSupplierSummary(params.supplier),
    fileChecksum: params.fileChecksum,
    headerFingerprint: params.headerFingerprint,
    mappingChecksum: params.mappingChecksum,
    contentChecksum: params.contentChecksum,
    summary: params.summary,
    validRows: params.validRows,
    unknownRows: params.unknownRows,
    errorRows: params.errorRows,
  };
}
