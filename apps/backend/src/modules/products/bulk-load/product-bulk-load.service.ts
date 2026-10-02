import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { stringify as stringifyCsv } from 'csv-stringify/sync';
import Decimal from 'decimal.js';
import {
  AuditAction,
  ProductBulkFileErrorCode,
  ProductBulkLoadRowStatus,
  ProductImportBatchResult,
  IProductBulkLoadPreviewResponse,
  IProductBulkLoadConfirmResponse,
} from '@erp/shared-types';
import { ProductImportBatch } from '../entities/product-import-batch.entity';
import { Category } from '../../categories/entities/category.entity';
import { Unit } from '../../units/entities/unit.entity';
import { ProductsService } from '../products.service';
import { AuditService } from '../../audit/audit.service';
import { ProductBulkFileParser } from './product-bulk-file-parser';
import { ProductBulkLoadValidator } from './product-bulk-load-validator';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';

@Injectable()
export class ProductBulkLoadService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly productsService: ProductsService,
    private readonly auditService: AuditService,
    private readonly validator: ProductBulkLoadValidator,
    @InjectRepository(ProductImportBatch)
    private readonly batchRepository: Repository<ProductImportBatch>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
  ) {}

  /**
   * Generates a template file (XLSX with reference sheet, or CSV) for product catalog bulk import.
   */
  async generateTemplate(
    format: 'xlsx' | 'csv' = 'xlsx',
  ): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    const [categories, units] = await Promise.all([
      this.categoryRepository.find({ order: { name: 'ASC' } }),
      this.unitRepository.find({ order: { name: 'ASC' } }),
    ]);

    if (format === 'csv') {
      const csvHeaders = [
        'name',
        'category',
        'baseUnit',
        'costNet',
        'activePriceNet',
        'description',
        'minStock',
        'initialStock',
        'markupPercentage',
        'taxTreatment',
        'ivaPercentage',
        'conversions',
      ];

      const csvContent = stringifyCsv([], {
        header: true,
        columns: csvHeaders,
      });

      return {
        buffer: Buffer.from(csvContent, 'utf8'),
        contentType: 'text/csv; charset=utf-8',
        filename: 'plantilla_productos.csv',
      };
    }

    // XLSX template generation
    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Productos (Main data entry sheet)
    const productSheet = workbook.addWorksheet('Productos', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    productSheet.columns = [
      { header: 'name', key: 'name', width: 32 },
      { header: 'category', key: 'category', width: 20 },
      { header: 'baseUnit', key: 'baseUnit', width: 16 },
      { header: 'costNet', key: 'costNet', width: 14 },
      { header: 'activePriceNet', key: 'activePriceNet', width: 16 },
      { header: 'description', key: 'description', width: 34 },
      { header: 'minStock', key: 'minStock', width: 14 },
      { header: 'initialStock', key: 'initialStock', width: 14 },
      { header: 'markupPercentage', key: 'markupPercentage', width: 18 },
      { header: 'taxTreatment', key: 'taxTreatment', width: 16 },
      { header: 'ivaPercentage', key: 'ivaPercentage', width: 14 },
      { header: 'conversions', key: 'conversions', width: 28 },
    ];

    const headerRow = productSheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
    headerRow.height = 24;

    // Sheet 2: Referencia (Categories, Units, Valid Values)
    const refSheet = workbook.addWorksheet('Referencia', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    refSheet.columns = [
      { header: 'Categoría', key: 'catName', width: 25 },
      { header: 'Descripción Categoría', key: 'catDesc', width: 30 },
      { header: '', key: 'sep1', width: 5 },
      { header: 'Unidad de Medida', key: 'unitName', width: 22 },
      { header: 'Símbolo', key: 'unitSymbol', width: 12 },
      { header: '', key: 'sep2', width: 5 },
      { header: 'Reglas y Valores Permitidos', key: 'rules', width: 36 },
    ];

    const refHeaderRow = refSheet.getRow(1);
    refHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    refHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF334155' },
    };
    refHeaderRow.height = 24;

    const rulesInfo = [
      'Tratamiento fiscal: GRAVADO, EXENTO, NO_GRAVADO',
      'Alícuota IVA: 0, 2.5, 5, 10.5, 21, 27',
      'Conversiones: Presentacion:Factor (ej. Caja:10; Blister:5)',
      'Decimales: Costo (4), Precios/Stock (2)',
      'Máximo 1000 filas por archivo',
    ];

    const maxRows = Math.max(categories.length, units.length, rulesInfo.length);
    for (let i = 0; i < maxRows; i++) {
      const cat = categories[i];
      const unit = units[i];
      const rule = rulesInfo[i];

      refSheet.addRow({
        catName: cat ? cat.name : '',
        catDesc: cat ? cat.description || '' : '',
        sep1: '',
        unitName: unit ? unit.name : '',
        unitSymbol: unit ? unit.symbol : '',
        sep2: '',
        rules: rule || '',
      });
    }

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    return {
      buffer,
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: 'plantilla_productos.xlsx',
    };
  }

  /**
   * Parses and validates uploaded file for preview presentation without writing to the database.
   */
  async previewBulkLoad(
    file: Express.Multer.File,
  ): Promise<IProductBulkLoadPreviewResponse> {
    if (!file || !file.buffer) {
      throw new BadRequestException({
        code: ProductBulkFileErrorCode.BULK_LOAD_MISSING_FILE,
        message: 'No se ha adjuntado ningún archivo.',
      });
    }

    const parsed = await ProductBulkFileParser.parse(
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
   * Atomically executes bulk product creation in a single transaction with idempotency and audit logs.
   */
  async confirmBulkLoad(
    file: Express.Multer.File,
    previewFileChecksum: string,
    actor: AuthenticatedUser,
  ): Promise<IProductBulkLoadConfirmResponse> {
    if (!file || !file.buffer) {
      throw new BadRequestException({
        code: ProductBulkFileErrorCode.BULK_LOAD_MISSING_FILE,
        message: 'No se ha adjuntado ningún archivo.',
      });
    }

    // 1. In-memory parse
    const parsed = await ProductBulkFileParser.parse(
      file.buffer,
      file.originalname,
      file.mimetype,
    );

    // 2. Anti-tamper verification
    if (parsed.fileChecksum !== previewFileChecksum) {
      throw new ConflictException({
        code: ProductBulkFileErrorCode.BULK_LOAD_PREVIEW_MISMATCH,
        message:
          'El archivo enviado no coincide con la previsualización autorizada.',
      });
    }

    // 3. Pre-transaction business validation
    const validation = await this.validator.validate(parsed.rawRows);

    if (validation.summary.totalRows === 0) {
      throw new BadRequestException({
        code: ProductBulkFileErrorCode.BULK_LOAD_NO_VALID_ROWS,
        message: 'El archivo no contiene filas de productos para cargar.',
      });
    }

    if (
      validation.summary.invalidRows > 0 ||
      !validation.valid ||
      !validation.contentChecksum
    ) {
      throw new BadRequestException({
        code: ProductBulkFileErrorCode.BULK_LOAD_VALIDATION_FAILED,
        message:
          'El archivo contiene errores de validación y no puede ser aplicado.',
      });
    }

    const contentChecksum = validation.contentChecksum;

    // Check duplicate content checksum before transaction
    const existingBatch = await this.batchRepository.findOne({
      where: { contentChecksum },
    });
    if (existingBatch) {
      throw new ConflictException({
        code: ProductBulkFileErrorCode.BULK_LOAD_ALREADY_CONFIRMED,
        message: 'Este lote de productos ya fue aplicado previamente.',
      });
    }

    const validRows = validation.rows.filter(
      (r) => r.status === ProductBulkLoadRowStatus.VALID && r.product,
    );

    // Sort valid rows deterministically by name ASC
    validRows.sort((a, b) => a.product!.name.localeCompare(b.product!.name));

    const movementCount = validRows.filter(
      (r) => r.product!.initialStock > 0,
    ).length;

    try {
      return await this.dataSource.transaction(async (manager) => {
        // Create batch record
        const batch = manager.create(ProductImportBatch, {
          contentChecksum,
          fileChecksum: parsed.fileChecksum,
          actorId: actor.id,
          rowCount: validRows.length,
          movementCount,
          totalQuantityBase: new Decimal(
            validation.summary.totalInitialStock,
          ).toFixed(2),
          result: ProductImportBatchResult.COMPLETED,
        });

        const savedBatch = await manager.save(ProductImportBatch, batch);

        // Create each product using extracted core method
        for (const row of validRows) {
          const p = row.product!;
          await this.productsService.createProductCore(
            {
              name: p.name,
              description: p.description,
              categoryId: p.categoryId,
              baseUnitId: p.baseUnitId,
              minStock: p.minStock,
              initialStock: p.initialStock,
              costNet: p.costNet,
              markupPercentage: p.markupPercentage,
              activePriceNet: p.activePriceNet,
              taxTreatment: p.taxTreatment,
              ivaPercentage: p.ivaPercentage,
              conversions: p.conversions.map((c) => ({
                presentationUnitId: c.presentationUnitId,
                conversionFactor: c.conversionFactor,
              })),
              documentReference: `BULK_LOAD:${savedBatch.id}`,
              adjustmentReason: 'Carga inicial de inventario',
            },
            actor,
            manager,
          );
        }

        // Consolidated batch-level audit record
        await this.auditService.record(manager, {
          actorId: actor.id,
          action: AuditAction.CREATE,
          entityName: 'ProductBulkLoad',
          entityId: savedBatch.id,
          previousValues: null,
          newValues: {
            batchId: savedBatch.id,
            contentChecksum: savedBatch.contentChecksum,
            fileChecksum: savedBatch.fileChecksum,
            totalRows: validation.summary.totalRows,
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
          totalQuantityBase: Number(savedBatch.totalQuantityBase),
          confirmedAt: savedBatch.createdAt.toISOString(),
        };
      });
    } catch (error: any) {
      if (
        error?.code === '23505' &&
        (error?.detail?.includes('content_checksum') ||
          error?.constraint?.includes('content_checksum'))
      ) {
        throw new ConflictException({
          code: ProductBulkFileErrorCode.BULK_LOAD_ALREADY_CONFIRMED,
          message: 'Este lote de productos ya fue aplicado previamente.',
        });
      }
      throw error;
    }
  }
}
