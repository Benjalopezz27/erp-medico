import {
  Injectable,
  BadRequestException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { stringify as stringifyCsv } from 'csv-stringify/sync';
import Decimal from 'decimal.js';
import {
  ProductStatus,
  StockMovementType,
  StockBulkFileErrorCode,
  StockImportBatchResult,
  StockBulkLoadRowStatus,
  AuditAction,
  IStockBulkLoadPreviewResponse,
  IStockBulkLoadConfirmResponse,
} from '@erp/shared-types';
import { StockImportBatch } from '../entities/stock-import-batch.entity';
import { Product } from '../../products/entities/product.entity';
import { StockService } from '../stock.service';
import { AuditService } from '../../audit/audit.service';
import {
  StockBulkFileParser,
  BULK_LOAD_MAX_DATA_ROWS,
} from './stock-bulk-file-parser';
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
   * Generates a template file (CSV or XLSX) pre-populated with active products.
   */
  async generateTemplate(
    format: 'xlsx' | 'csv' = 'xlsx',
  ): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    const products = await this.productRepository.find({
      where: { status: ProductStatus.ACTIVE },
      relations: ['baseUnit'],
      select: {
        id: true,
        internalCode: true,
        name: true,
        status: true,
        baseUnit: {
          id: true,
          name: true,
          symbol: true,
        },
      },
      order: { internalCode: 'ASC' },
      take: BULK_LOAD_MAX_DATA_ROWS + 1, // 1001
    });

    if (products.length > BULK_LOAD_MAX_DATA_ROWS) {
      throw new UnprocessableEntityException({
        code: StockBulkFileErrorCode.BULK_LOAD_TEMPLATE_ROW_LIMIT_EXCEEDED,
        message: `El catálogo de productos activos supera el límite máximo de ${BULK_LOAD_MAX_DATA_ROWS} productos para la plantilla de carga inicial.`,
      });
    }

    if (format === 'csv') {
      const csvData = products.map((p) => [
        p.internalCode,
        p.name,
        p.baseUnit ? `${p.baseUnit.name} (${p.baseUnit.symbol})` : '',
        '',
      ]);

      const csvContent = stringifyCsv(csvData, {
        header: true,
        columns: ['internalCode', 'productName', 'baseUnit', 'quantityBase'],
      });

      return {
        buffer: Buffer.from(csvContent, 'utf8'),
        contentType: 'text/csv; charset=utf-8',
        filename: 'plantilla_carga_stock.csv',
      };
    }

    // XLSX template generation
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Inventario', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    worksheet.columns = [
      { header: 'internalCode', key: 'internalCode', width: 16 },
      { header: 'productName', key: 'productName', width: 40 },
      { header: 'baseUnit', key: 'baseUnit', width: 24 },
      { header: 'quantityBase', key: 'quantityBase', width: 18 },
    ];

    // Style Header Row (Dark Slate with bold white text)
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
    headerRow.height = 24;

    // Add Data Rows with visual differentiation
    for (const p of products) {
      const baseUnitLabel = p.baseUnit
        ? `${p.baseUnit.name} (${p.baseUnit.symbol})`
        : '';

      const row = worksheet.addRow({
        internalCode: p.internalCode,
        productName: p.name,
        baseUnit: baseUnitLabel,
        quantityBase: null,
      });

      // Soft neutral background for informative columns
      const neutralFill: ExcelJS.Fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8FAFC' },
      };

      row.getCell(1).fill = neutralFill;
      row.getCell(2).fill = neutralFill;
      row.getCell(3).fill = neutralFill;

      // Soft yellow background and numeric formatting for quantityBase
      const editableCell = row.getCell(4);
      editableCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFEF3C7' },
      };
      editableCell.numFmt = '#,##0.00';
    }

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

    if (validation.summary.includedRows === 0) {
      throw new BadRequestException({
        code: StockBulkFileErrorCode.BULK_LOAD_NO_INCLUDED_ROWS,
        message: 'El archivo no contiene filas con cantidades a cargar.',
      });
    }

    if (
      validation.summary.invalidRows > 0 ||
      !validation.valid ||
      !validation.contentChecksum
    ) {
      throw new BadRequestException({
        code: StockBulkFileErrorCode.BULK_LOAD_VALIDATION_FAILED,
        message:
          'El archivo contiene errores de validación y no puede ser aplicado.',
      });
    }

    const contentChecksum = validation.contentChecksum;
    const validRows = validation.rows.filter(
      (r) => r.status === StockBulkLoadRowStatus.INCLUDED_VALID && r.product,
    );

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
          rowCount: validation.summary.includedRows,
          movementCount: validRows.length,
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
            totalRows: validation.summary.totalRows,
            includedRows: validation.summary.includedRows,
            skippedRows: validation.summary.skippedRows,
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
