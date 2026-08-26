import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import Decimal from 'decimal.js';
import {
  ImporterErrorCode,
  AuditAction,
  IImporterConfirmResponse,
  IImporterBatchDetailResponse,
  ISupplierImportMapping,
} from '@erp/shared-types';
import { SupplierImportBatch } from '../entities/supplier-import-batch.entity';
import { SupplierImportBatchItem } from '../entities/supplier-import-batch-item.entity';
import { SupplierImportTemplate } from '../entities/supplier-import-template.entity';
import { SupplierProduct } from '../../suppliers/supplier-products/entities/supplier-product.entity';
import { ImporterPreviewService } from './importer-preview.service';
import { AuditService } from '../../audit/audit.service';
import { ImporterConfirmMultipartDto } from '../dto/importer-confirm-multipart.dto';
import { normalizeHeader } from '../../../shared/parsers/secure-spreadsheet-parser';

@Injectable()
export class ImporterConfirmationService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(SupplierImportBatch)
    private readonly batchRepo: Repository<SupplierImportBatch>,
    @InjectRepository(SupplierImportTemplate)
    private readonly templateRepo: Repository<SupplierImportTemplate>,
    private readonly importerPreviewService: ImporterPreviewService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Confirms and atomically applies an import price list for a supplier.
   */
  async confirmImport(
    fileBuffer: Buffer,
    originalFilename: string,
    mimetype: string,
    dto: ImporterConfirmMultipartDto,
    actorId: string,
  ): Promise<IImporterConfirmResponse> {
    // 1. Phase 1: Fast Pre-Validation outside transaction
    const preCheck = await this.importerPreviewService.generatePreview(
      fileBuffer,
      originalFilename,
      mimetype,
      {
        supplierId: dto.supplierId,
        expectedFileChecksum: dto.expectedFileChecksum,
        mapping: dto.mapping,
      },
    );

    if (
      preCheck.fileChecksum.toLowerCase() !==
      dto.expectedFileChecksum.trim().toLowerCase()
    ) {
      throw new ConflictException({
        code: ImporterErrorCode.IMPORTER_CONFIRM_FILE_MISMATCH,
        message:
          'El archivo enviado no coincide con el archivo validado durante la vista previa.',
      });
    }

    if (
      preCheck.mappingChecksum.toLowerCase() !==
      dto.expectedMappingChecksum.trim().toLowerCase()
    ) {
      throw new ConflictException({
        code: ImporterErrorCode.IMPORTER_CONFIRM_MAPPING_MISMATCH,
        message:
          'La configuración de mapeo de columnas no coincide con la validada durante la vista previa.',
      });
    }

    if (
      preCheck.contentChecksum.toLowerCase() !==
      dto.expectedContentChecksum.trim().toLowerCase()
    ) {
      throw new ConflictException({
        code: ImporterErrorCode.IMPORTER_CONFIRM_CONTENT_MISMATCH,
        message:
          'El contenido evaluado no coincide con el checksum de vista previa esperado.',
      });
    }

    if (!preCheck.summary.canContinue || preCheck.validRows.length === 0) {
      throw new ConflictException({
        code: ImporterErrorCode.IMPORTER_CONFIRM_PREVIEW_INVALID,
        message:
          'La vista previa contiene errores o SKUs desconocidos y no puede confirmarse.',
      });
    }

    // Validate optional templateId if passed
    let templateIdToPersist: string | null = null;
    if (dto.templateId) {
      const template = await this.templateRepo.findOne({
        where: { id: dto.templateId },
      });
      if (template) {
        if (template.supplierId !== dto.supplierId) {
          throw new BadRequestException({
            code: ImporterErrorCode.IMPORTER_TEMPLATE_NOT_FOUND,
            message:
              'La plantilla especificada no pertenece al proveedor seleccionado.',
          });
        }
        if (template.headerFingerprint !== preCheck.headerFingerprint) {
          throw new BadRequestException({
            code: ImporterErrorCode.IMPORTER_FINGERPRINT_MISMATCH,
            message:
              'La estructura del archivo no coincide con la plantilla especificada.',
          });
        }
        templateIdToPersist = template.id;
      }
      // If template was deleted in the interim, proceed with templateIdToPersist = null
    }

    // Build canonical mapping snapshot for database record
    let parsedRawMapping: ISupplierImportMapping;
    try {
      parsedRawMapping = JSON.parse(dto.mapping);
    } catch {
      throw new BadRequestException({
        code: ImporterErrorCode.IMPORTER_MAPPING_INVALID_JSON,
        message: 'El formato JSON del mapeo de columnas es inválido.',
      });
    }

    const canonicalMappingSnapshot: ISupplierImportMapping = {
      supplierSku: normalizeHeader(parsedRawMapping.supplierSku),
      usualCostNet: normalizeHeader(parsedRawMapping.usualCostNet),
      supplierDescription: parsedRawMapping.supplierDescription
        ? normalizeHeader(parsedRawMapping.supplierDescription)
        : null,
      rawQuantity: parsedRawMapping.rawQuantity
        ? normalizeHeader(parsedRawMapping.rawQuantity)
        : null,
      purchaseUnit: parsedRawMapping.purchaseUnit
        ? normalizeHeader(parsedRawMapping.purchaseUnit)
        : null,
    };

    // 2. Phase 2: Transactional Execution
    try {
      return await this.dataSource.transaction(async (manager) => {
        // A. Re-evaluate dataset within transaction and acquire pessimistic locks
        const txPreview = await this.importerPreviewService.generatePreview(
          fileBuffer,
          originalFilename,
          mimetype,
          {
            supplierId: dto.supplierId,
            expectedFileChecksum: dto.expectedFileChecksum,
            mapping: dto.mapping,
          },
          manager,
          true, // acquire pessimistic locks on sp.id ASC
        );

        // B. Re-verify explicit checksums inside transaction
        if (
          txPreview.fileChecksum.toLowerCase() !==
          dto.expectedFileChecksum.trim().toLowerCase()
        ) {
          throw new ConflictException({
            code: ImporterErrorCode.IMPORTER_CONFIRM_FILE_MISMATCH,
            message:
              'El archivo enviado no coincide con el archivo validado durante la vista previa.',
          });
        }

        if (
          txPreview.mappingChecksum.toLowerCase() !==
          dto.expectedMappingChecksum.trim().toLowerCase()
        ) {
          throw new ConflictException({
            code: ImporterErrorCode.IMPORTER_CONFIRM_MAPPING_MISMATCH,
            message:
              'La configuración de mapeo de columnas no coincide con la validada durante la vista previa.',
          });
        }

        if (
          txPreview.contentChecksum.toLowerCase() !==
          dto.expectedContentChecksum.trim().toLowerCase()
        ) {
          throw new ConflictException({
            code: ImporterErrorCode.IMPORTER_CONFIRM_CONTENT_MISMATCH,
            message:
              'El catálogo o los productos sufrieron modificaciones concurrentes. Por favor, revalide la vista previa.',
          });
        }

        if (
          !txPreview.summary.canContinue ||
          txPreview.validRows.length === 0
        ) {
          throw new ConflictException({
            code: ImporterErrorCode.IMPORTER_CONFIRM_PREVIEW_INVALID,
            message:
              'Existen filas en error o SKUs no resueltos al momento de la confirmación.',
          });
        }

        // C. Fetch locked SupplierProducts
        const spRepo = manager.getRepository(SupplierProduct);
        const batchRepo = manager.getRepository(SupplierImportBatch);
        const itemRepo = manager.getRepository(SupplierImportBatchItem);

        // Compute diffs for all valid rows
        let changedRowsCount = 0;
        let unchangedRowsCount = 0;
        const batchItemsDraft: {
          rowNumber: number;
          supplierProductId: string;
          productId: string;
          supplierSkuSnapshot: string;
          previousUsualCostNet: string | null;
          newUsualCostNet: string;
          previousDescription: string | null;
          newDescription: string | null;
          costChanged: boolean;
          descriptionChanged: boolean;
          spEntity: SupplierProduct;
          prevSnapshot: Record<string, unknown>;
          newSnapshot: Record<string, unknown>;
        }[] = [];

        for (const validRow of txPreview.validRows) {
          const sp = await spRepo.findOneOrFail({
            where: { id: validRow.supplierProduct.id },
          });

          const prevCost =
            sp.usualCostNet !== null && sp.usualCostNet !== undefined
              ? String(sp.usualCostNet)
              : null;
          const newCost = new Decimal(validRow.usualCostNet).toFixed(4);

          const costChanged =
            prevCost === null ||
            !new Decimal(prevCost).equals(new Decimal(newCost));

          let descChanged = false;
          const prevDesc = sp.supplierDescription;
          let newDesc = prevDesc;

          if (
            validRow.supplierDescription !== null &&
            validRow.supplierDescription !== undefined
          ) {
            const trimmed = validRow.supplierDescription.trim();
            if (trimmed.length > 0 && trimmed !== (prevDesc || '')) {
              newDesc = trimmed;
              descChanged = true;
            }
          }

          const prevSnapshot = {
            id: sp.id,
            supplierId: sp.supplierId,
            productId: sp.productId,
            supplierExternalCode: sp.supplierExternalCode,
            supplierDescription: sp.supplierDescription,
            purchaseUnitId: sp.purchaseUnitId,
            conversionFactorToBase: String(sp.conversionFactorToBase),
            usualCostNet:
              sp.usualCostNet !== null ? String(sp.usualCostNet) : null,
            isPrimarySupplier: sp.isPrimarySupplier,
          };

          const newSnapshot = {
            ...prevSnapshot,
            usualCostNet: costChanged ? newCost : prevSnapshot.usualCostNet,
            supplierDescription: descChanged ? newDesc : prevDesc,
          };

          if (costChanged || descChanged) {
            changedRowsCount++;
          } else {
            unchangedRowsCount++;
          }

          batchItemsDraft.push({
            rowNumber: validRow.rowNumber,
            supplierProductId: sp.id,
            productId: validRow.product.id,
            supplierSkuSnapshot: validRow.rawSku,
            previousUsualCostNet: prevCost,
            newUsualCostNet: newCost,
            previousDescription: prevDesc,
            newDescription: newDesc,
            costChanged,
            descriptionChanged: descChanged,
            spEntity: sp,
            prevSnapshot,
            newSnapshot,
          });
        }

        // D. Create and insert SupplierImportBatch (enforces UQ_supplier_import_batches_supplier_content_checksum)
        const batch = batchRepo.create({
          supplierId: dto.supplierId,
          actorId,
          templateId: templateIdToPersist,
          fileName: originalFilename.slice(0, 255),
          fileChecksum: txPreview.fileChecksum,
          headerFingerprint: txPreview.headerFingerprint,
          mappingChecksum: txPreview.mappingChecksum,
          contentChecksum: txPreview.contentChecksum,
          mappingSnapshot: canonicalMappingSnapshot,
          totalRows: txPreview.summary.totalRows,
          appliedRows: txPreview.validRows.length,
          changedRows: changedRowsCount,
          unchangedRows: unchangedRowsCount,
        });

        await batchRepo.save(batch);

        // E. Apply mutations and collect audits
        const batchItems: SupplierImportBatchItem[] = [];

        for (const draft of batchItemsDraft) {
          if (draft.costChanged || draft.descriptionChanged) {
            if (draft.costChanged) {
              draft.spEntity.usualCostNet = draft.newUsualCostNet;
            }
            if (draft.descriptionChanged) {
              draft.spEntity.supplierDescription = draft.newDescription;
            }

            await spRepo.save(draft.spEntity);

            await this.auditService.record(manager, {
              actorId,
              action: AuditAction.UPDATE,
              entityName: 'SupplierProduct',
              entityId: draft.spEntity.id,
              previousValues: draft.prevSnapshot,
              newValues: draft.newSnapshot,
            });
          }

          batchItems.push(
            itemRepo.create({
              batchId: batch.id,
              rowNumber: draft.rowNumber,
              supplierProductId: draft.supplierProductId,
              productId: draft.productId,
              supplierSkuSnapshot: draft.supplierSkuSnapshot,
              previousUsualCostNet: draft.previousUsualCostNet,
              newUsualCostNet: draft.newUsualCostNet,
              previousDescription: draft.previousDescription,
              newDescription: draft.newDescription,
              costChanged: draft.costChanged,
              descriptionChanged: draft.descriptionChanged,
            }),
          );
        }

        // Bulk insert batch items
        await itemRepo.save(batchItems);

        // Record batch creation audit log
        await this.auditService.record(manager, {
          actorId,
          action: AuditAction.CREATE,
          entityName: 'SupplierImportBatch',
          entityId: batch.id,
          previousValues: null,
          newValues: {
            id: batch.id,
            supplierId: batch.supplierId,
            actorId: batch.actorId,
            templateId: batch.templateId,
            fileName: batch.fileName,
            fileChecksum: batch.fileChecksum,
            headerFingerprint: batch.headerFingerprint,
            mappingChecksum: batch.mappingChecksum,
            contentChecksum: batch.contentChecksum,
            totalRows: batch.totalRows,
            appliedRows: batch.appliedRows,
            changedRows: batch.changedRows,
            unchangedRows: batch.unchangedRows,
          },
        });

        return {
          batchId: batch.id,
          supplier: txPreview.supplier,
          fileName: batch.fileName,
          fileChecksum: batch.fileChecksum,
          mappingChecksum: batch.mappingChecksum,
          contentChecksum: batch.contentChecksum,
          totalRows: batch.totalRows,
          appliedRows: batch.appliedRows,
          changedRows: batch.changedRows,
          unchangedRows: batch.unchangedRows,
          confirmedAt: batch.createdAt.toISOString(),
          templateId: batch.templateId,
        };
      });
    } catch (err: any) {
      // Check for PostgreSQL unique constraint collision (error code 23505)
      const constraint =
        err?.driverError?.constraint ?? err?.constraint ?? err?.message;
      if (
        typeof constraint === 'string' &&
        (constraint.includes(
          'UQ_supplier_import_batches_supplier_content_checksum',
        ) ||
          constraint.includes('23505'))
      ) {
        // Outside the aborted transaction, query the existing batch to return its ID for recovery
        const existingBatch = await this.batchRepo.findOne({
          where: {
            supplierId: dto.supplierId,
            contentChecksum: dto.expectedContentChecksum,
          },
        });

        throw new ConflictException({
          code: ImporterErrorCode.IMPORTER_BATCH_ALREADY_CONFIRMED,
          message:
            'Este archivo y configuración ya fueron confirmados previamente para este proveedor.',
          existingBatchId: existingBatch?.id,
        });
      }

      throw err;
    }
  }

  /**
   * Retrieves a confirmed batch receipt and item summary by batchId.
   */
  async getBatchById(batchId: string): Promise<IImporterBatchDetailResponse> {
    const batch = await this.batchRepo.findOne({
      where: { id: batchId },
      relations: ['supplier', 'items'],
    });

    if (!batch) {
      throw new NotFoundException({
        code: ImporterErrorCode.IMPORTER_BATCH_NOT_FOUND,
        message: `Lote de importación con ID "${batchId}" no encontrado.`,
      });
    }

    const items: IImporterBatchDetailResponse['items'] = (batch.items || [])
      .sort((a, b) => a.rowNumber - b.rowNumber)
      .map((item) => ({
        id: item.id,
        rowNumber: item.rowNumber,
        supplierSku: item.supplierSkuSnapshot,
        productId: item.productId,
        previousCostNet: item.previousUsualCostNet,
        newCostNet: item.newUsualCostNet,
        costChanged: item.costChanged,
        previousDescription: item.previousDescription,
        newDescription: item.newDescription,
        descriptionChanged: item.descriptionChanged,
      }));

    return {
      batch: {
        batchId: batch.id,
        supplier: {
          id: batch.supplier.id,
          businessName: batch.supplier.businessName,
          cuit: batch.supplier.cuit,
        },
        fileName: batch.fileName,
        fileChecksum: batch.fileChecksum,
        mappingChecksum: batch.mappingChecksum,
        contentChecksum: batch.contentChecksum,
        totalRows: batch.totalRows,
        appliedRows: batch.appliedRows,
        changedRows: batch.changedRows,
        unchangedRows: batch.unchangedRows,
        confirmedAt: batch.createdAt.toISOString(),
        templateId: batch.templateId,
      },
      items,
    };
  }
}
