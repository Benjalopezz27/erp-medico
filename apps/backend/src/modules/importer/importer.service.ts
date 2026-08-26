import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ImporterErrorCode,
  type IImporterUploadResponse,
} from '@erp/shared-types';
import { SuppliersService } from '../suppliers/suppliers.service';
import { UploadFileBodyDto } from './dto/upload-file-body.dto';
import { SecureSpreadsheetParser } from '../../shared/parsers/secure-spreadsheet-parser';
import { SupplierImportTemplatesService } from './services/supplier-import-templates.service';
import { SupplierImportTemplateMapper } from './mappers/supplier-import-template.mapper';

@Injectable()
export class ImporterService {
  constructor(
    private readonly suppliersService: SuppliersService,
    private readonly templatesService: SupplierImportTemplatesService,
  ) {}

  getStatus(): { module: string; status: string } {
    return { module: 'importer', status: 'initialized' };
  }

  async uploadFile(
    dto: UploadFileBodyDto,
    file: Express.Multer.File | undefined,
  ): Promise<IImporterUploadResponse> {
    if (!file) {
      throw new BadRequestException({
        code: ImporterErrorCode.IMPORTER_FILE_MISSING,
        message: 'No se ha seleccionado ningún archivo para cargar.',
      });
    }
    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException({
        code: ImporterErrorCode.IMPORTER_FILE_EMPTY,
        message: 'El archivo seleccionado está vacío.',
      });
    }

    let supplier;
    try {
      supplier = await this.suppliersService.findOne(dto.supplierId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException({
          code: ImporterErrorCode.IMPORTER_SUPPLIER_NOT_FOUND,
          message: `El proveedor con ID ${dto.supplierId} no existe.`,
        });
      }
      throw error;
    }

    if (!supplier.isActive) {
      throw new BadRequestException({
        code: ImporterErrorCode.IMPORTER_SUPPLIER_INACTIVE,
        message: 'El proveedor seleccionado se encuentra inactivo.',
      });
    }

    const parsed = await SecureSpreadsheetParser.parse(
      file.buffer,
      file.originalname,
      file.mimetype,
      { formulaPolicy: 'reject' },
    );

    // Auto-detect matching template if one exists for this supplier and fingerprint
    const matchingTemplate = await this.templatesService.findByFingerprint(
      supplier.id,
      parsed.headerFingerprint,
    );

    return {
      supplier: {
        id: supplier.id,
        businessName: supplier.businessName,
        cuit: supplier.cuit,
      },
      fileName: parsed.sanitizedFileName,
      fileSize: file.buffer.length,
      clientMimeType: file.mimetype || 'application/octet-stream',
      detectedFormat: parsed.detectedFormat,
      fileChecksum: parsed.fileChecksum,
      headerFingerprint: parsed.headerFingerprint,
      headers: parsed.headers,
      normalizedHeaders: parsed.normalizedHeaders,
      totalRows: parsed.totalRows,
      totalColumns: parsed.totalColumns,
      sampleRows: parsed.rows.slice(0, 20).map((row) => ({
        rowNumber: row.rowNumber,
        cells: row.cells.map((cell) => (cell === null ? null : String(cell))),
      })),
      detectedTemplate: matchingTemplate
        ? SupplierImportTemplateMapper.toSummary(matchingTemplate)
        : null,
    };
  }
}
