import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import Decimal from 'decimal.js';
import {
  ProductStatus,
  StockMovementType,
  StockBulkFileErrorCode,
  StockImportBatchResult,
  AuditAction,
  IStockBulkLoadPreviewResponse,
  IStockBulkLoadConfirmResponse,
} from '@erp/shared-types';
import { StockImportBatch } from '../entities/stock-import-batch.entity';
import { Product } from '../../products/entities/product.entity';
import { StockService } from '../stock.service';
import { AuditService } from '../../audit/audit.service';
import { StockBulkFileParser } from './stock-bulk-file-parser';
import { StockBulkLoadValidator } from './stock-bulk-load-validator';
import { parseStockDecimal } from '../utils/stock-math.utils';

export interface AuthenticatedActor {
  id: string;
  email: string;
  role: string;
}

@Injectable()
export class StockBulkLoadService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly stockService: StockService,
    private readonly auditService: AuditService,
    private readonly validator: StockBulkLoadValidator,
    @InjectRepository(StockImportBatch)
    private readonly batchRepository: Repository<StockImportBatch>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  /**
   * Generates a template file (CSV or XLSX) with only headers.
   */
  async generateTemplate(
    format: 'xlsx' | 'csv' = 'xlsx',
  ): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    if (format === 'csv') {
      const csvContent = 'internalCode,quantityBase\n';
      return {
        buffer: Buffer.from(csvContent, 'utf8'),
        contentType: 'text/csv; charset=utf-8',
        filename: 'plantilla_carga_stock.csv',
      };
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Inventario');
    worksheet.addRow(['internalCode', 'quantityBase']);

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    return {
      buffer,
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: 'plantilla_carga_stock.xlsx',
    };
  }

  /**
   * Parses and validates uploaded file for preview presentation.
   */
  async previewBulkLoad(
    file: Express.Multer.File,
  ): Promise<IStockBulkLoadPreviewResponse> {
    if (!file || !file.buffer) {
      throw new BadRequestException({
        code: StockBulkFileErrorCode.BULK_LOAD_MISSING_FILE,
        message: 'No se ha adjuntado ningún archivo.',
      });
    }

    const parsed = await StockBulkFileParser.parse(
      file.buffer,
      file.originalname,
      file.mimetype,
    );

    const validation = await this.validator.validate(parsed.rawRows);

    return {
      fileChecksum: parsed.fileChecksum,
      contentChecksum: validation.contentChecksum,
      valid: validation.valid,
      summary: validation.summary,
      rows: validation.rows,
    };
  }

  /**
   * Revalidates and executes atomic bulk stock import in a single transaction.
   */
  async confirmBulkLoad(
    file: Express.Multer.File,
    previewFileChecksum: string,
    actor: AuthenticatedActor,
  ): Promise<IStockBulkLoadConfirmResponse> {
    if (!file || !file.buffer) {
      throw new BadRequestException({
        code: StockBulkFileErrorCode.BULK_LOAD_MISSING_FILE,
        message: 'No se ha adjuntado ningún archivo.',
      });
    }

    // 1. In-memory parse
    const parsed = await StockBulkFileParser.parse(
      file.buffer,
      file.originalname,
      file.mimetype,
    );

    // 2. Anti-tamper verification
    if (parsed.fileChecksum !== previewFileChecksum) {
      throw new ConflictException({
        code: StockBulkFileErrorCode.BULK_LOAD_PREVIEW_MISMATCH,
        message:
          'El archivo enviado no coincide con la previsualización autorizada.',
      });
    }

    // 3. Pre-transaction validation
    const validation = await this.validator.validate(parsed.rawRows);
    if (!validation.valid || !validation.contentChecksum) {
      throw new BadRequestException({
        code: StockBulkFileErrorCode.BULK_LOAD_VALIDATION_FAILED,
        message:
          'El archivo contiene errores de validación y no puede ser aplicado.',
      });
    }

    const contentChecksum = validation.contentChecksum;
    const validRows = validation.rows.filter((r) => r.isValid && r.product);

    // 4. Sort rows deterministically by productId ASC to eliminate concurrent deadlocks
    validRows.sort((a, b) =>
      (a.product?.id || '').localeCompare(b.product?.id || ''),
    );

    // 5. Execute single atomic transaction
    try {
      return await this.dataSource.transaction(async (manager) => {
        // Pre-create batch entity
        const batch = manager.create(StockImportBatch, {
          contentChecksum,
          fileChecksum: parsed.fileChecksum,
          actorId: actor.id,
          rowCount: validation.summary.totalRows,
          movementCount: validation.summary.validRows,
          totalQuantityBase: new Decimal(
            validation.summary.totalQuantityBase,
          ).toFixed(2),
          result: StockImportBatchResult.COMPLETED,
        });

        const savedBatch = await manager.save(StockImportBatch, batch);

        // Process rows in stable sorted order
        for (const row of validRows) {
          const productId = row.product!.id;

          // Re-verify product status within transaction
          const product = await manager.findOne(Product, {
            where: { id: productId },
          });

          if (!product || product.status !== ProductStatus.ACTIVE) {
            throw new BadRequestException({
              code: StockBulkFileErrorCode.BULK_LOAD_VALIDATION_FAILED,
              message: `El producto con código "${row.internalCode}" no está activo para recibir movimientos.`,
            });
          }

          await this.stockService.recordMovement(
            {
              productId,
              movementType: StockMovementType.AJUSTE_ENTRADA,
              quantityBase: row.quantityBase!,
              reason: 'Carga inicial de inventario',
              documentReference: `BULK_LOAD:${savedBatch.id}`,
              userId: actor.id,
            },
            manager,
          );
        }

        // Consolidated batch-level audit record
        await this.auditService.record(manager, {
          actorId: actor.id,
          action: AuditAction.CREATE,
          entityName: 'StockBulkLoad',
          entityId: savedBatch.id,
          previousValues: null,
          newValues: {
            batchId: savedBatch.id,
            contentChecksum: savedBatch.contentChecksum,
            fileChecksum: savedBatch.fileChecksum,
            rowCount: savedBatch.rowCount,
            movementCount: savedBatch.movementCount,
            totalQuantityBase: savedBatch.totalQuantityBase,
            result: savedBatch.result,
          },
        });

        return {
          batchId: savedBatch.id,
          fileChecksum: savedBatch.fileChecksum,
          contentChecksum: savedBatch.contentChecksum,
          rowCount: savedBatch.rowCount,
          movementCount: savedBatch.movementCount,
          totalQuantityBase: parseStockDecimal(savedBatch.totalQuantityBase, 2),
          confirmedAt: savedBatch.createdAt.toISOString(),
        };
      });
    } catch (error: any) {
      // Catch unique violation on content_checksum outside transaction
      if (
        error?.code === '23505' &&
        (error?.detail?.includes('content_checksum') ||
          error?.constraint?.includes('content_checksum'))
      ) {
        throw new ConflictException({
          code: StockBulkFileErrorCode.BULK_LOAD_ALREADY_CONFIRMED,
          message: 'Este lote de inventario ya fue aplicado previamente.',
        });
      }

      throw error;
    }
  }
}
