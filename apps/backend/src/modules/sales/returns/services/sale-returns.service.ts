import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import Decimal from 'decimal.js';
import * as crypto from 'crypto';
import {
  ArcaStatus,
  AuditAction,
  FiscalDocumentType,
  ProductTaxTreatment,
  SaleReturnErrorCode,
  SaleReturnItemQuality,
  SaleStatus,
  StockMovementType,
} from '@erp/shared-types';
import { Sale } from '../../entities/sale.entity';
import { SaleItem } from '../../entities/sale-item.entity';
import { FiscalDocument } from '../../entities/fiscal-document.entity';
import { StockService } from '../../../stock/stock.service';
import { QuarantineService } from '../../../quarantine/quarantine.service';
import { ReceivablesService } from '../../../receivables/receivables.service';
import { AuditService } from '../../../audit/audit.service';
import { SaleReturn } from '../entities/sale-return.entity';
import { SaleReturnItem } from '../entities/sale-return-item.entity';
import { CreateSaleReturnDto } from '../dto/create-sale-return.dto';
import { SaleReturnResponseDto } from '../dto/sale-return-response.dto';
import { SaleReturnsMapper } from '../mappers/sale-returns.mapper';

@Injectable()
export class SaleReturnsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(SaleReturn)
    private readonly saleReturnRepository: Repository<SaleReturn>,
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    private readonly stockService: StockService,
    private readonly quarantineService: QuarantineService,
    private readonly receivablesService: ReceivablesService,
    private readonly auditService: AuditService,
  ) {}

  async createReturn(
    saleId: string,
    dto: CreateSaleReturnDto,
    userId: string,
  ): Promise<SaleReturnResponseDto> {
    this.validatePayload(dto);
    const requestHash = this.computeRequestHash(dto);

    try {
      const returnId = await this.dataSource.transaction(async (manager) => {
        // 1. Check idempotency if idempotencyKey provided
        if (dto.idempotencyKey) {
          const existingReturn = await manager
            .getRepository(SaleReturn)
            .findOne({
              where: { saleId, idempotencyKey: dto.idempotencyKey },
              relations: ['items', 'items.product', 'user', 'fiscalDocument'],
            });
          if (existingReturn) {
            if (existingReturn.requestHash === requestHash) {
              return existingReturn.id;
            } else {
              throw new ConflictException({
                code: SaleReturnErrorCode.SALE_RETURN_IDEMPOTENCY_CONFLICT,
                message:
                  'La clave de idempotencia ya fue utilizada con un contenido de devolución diferente.',
              });
            }
          }
        }

        // 2. Lock Sale (FOR UPDATE)
        const sale = await manager
          .getRepository(Sale)
          .createQueryBuilder('sale')
          .setLock('pessimistic_write')
          .where('sale.id = :id', { id: saleId })
          .getOne();

        if (!sale) {
          throw new NotFoundException({
            code: SaleReturnErrorCode.SALE_RETURN_SALE_NOT_FOUND,
            message: 'La venta especificada no existe.',
          });
        }

        const fiscalDocuments = await manager
          .getRepository(FiscalDocument)
          .find({ where: { saleId } });
        sale.fiscalDocuments = fiscalDocuments;

        if (sale.status !== SaleStatus.CONFIRMADA) {
          throw new ConflictException({
            code: SaleReturnErrorCode.SALE_RETURN_SALE_NOT_CONFIRMED,
            message:
              'Sólo se pueden realizar devoluciones sobre ventas confirmadas.',
          });
        }

        // 3. Lock SaleItems in deterministic order (by UUID ASC)
        const sortedItemDtos = [...dto.items].sort((a, b) =>
          a.saleItemId.localeCompare(b.saleItemId),
        );
        const requestedItemIds = sortedItemDtos.map((i) => i.saleItemId);

        const saleItems = await manager
          .getRepository(SaleItem)
          .createQueryBuilder('item')
          .setLock('pessimistic_write')
          .innerJoinAndSelect('item.product', 'product')
          .where('item.id IN (:...ids)', { ids: requestedItemIds })
          .orderBy('item.id', 'ASC')
          .getMany();

        if (saleItems.length !== requestedItemIds.length) {
          throw new NotFoundException({
            code: SaleReturnErrorCode.SALE_RETURN_ITEM_NOT_FOUND,
            message: 'Uno o más ítems especificados no existen.',
          });
        }

        // Validate that all items belong to this sale
        for (const item of saleItems) {
          if (item.saleId !== saleId) {
            throw new BadRequestException({
              code: SaleReturnErrorCode.SALE_RETURN_ITEM_DOES_NOT_BELONG_TO_SALE,
              message: `El ítem ${item.id} no pertenece a la venta ${saleId}.`,
            });
          }
        }

        const saleItemMap = new Map<string, SaleItem>(
          saleItems.map((item) => [item.id, item]),
        );

        // 4. Calculate accumulated returns for each item under lock
        let taxableNet = new Decimal(0);
        let exemptAmount = new Decimal(0);
        let nonTaxedAmount = new Decimal(0);
        let totalNet = new Decimal(0);
        let ivaTotal = new Decimal(0);
        let totalGross = new Decimal(0);

        interface PreparedReturnItem {
          dto: (typeof dto.items)[0];
          saleItem: SaleItem;
          quantity: Decimal;
          unitPriceNet: Decimal;
          subtotalNet: Decimal;
          taxTreatment: ProductTaxTreatment;
          ivaPercentage: Decimal | null;
          ivaAmount: Decimal;
          subtotalGross: Decimal;
        }

        const preparedItems: PreparedReturnItem[] = [];

        for (const itemDto of dto.items) {
          const saleItem = saleItemMap.get(itemDto.saleItemId)!;
          const returnQty = new Decimal(itemDto.quantityBase);

          // Query previous returned sum for this sale_item
          const previousReturnedResult = await manager
            .getRepository(SaleReturnItem)
            .createQueryBuilder('sri')
            .select('COALESCE(SUM(sri.quantity_base), 0)', 'total')
            .where('sri.sale_item_id = :saleItemId', {
              saleItemId: itemDto.saleItemId,
            })
            .getRawOne();

          const previousReturned = new Decimal(previousReturnedResult.total);
          const totalAfterReturn = previousReturned.plus(returnQty);
          const originalQty = new Decimal(saleItem.quantityBase);

          if (totalAfterReturn.greaterThan(originalQty)) {
            throw new ConflictException({
              code: SaleReturnErrorCode.SALE_RETURN_EXCEEDS_ORIGINAL_QUANTITY,
              message: `La cantidad a devolver (${returnQty.toString()}) supera el remanente disponible (${originalQty.minus(previousReturned).toString()}) para el producto.`,
            });
          }

          // Calculate fiscal values
          const unitPriceNet = new Decimal(saleItem.unitPriceNet);
          const subtotalNet = unitPriceNet
            .times(returnQty)
            .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

          const taxTreatment = saleItem.taxTreatment;
          let ivaPercentage: Decimal | null = null;
          let ivaAmount = new Decimal(0);

          if (taxTreatment === ProductTaxTreatment.GRAVADO) {
            ivaPercentage =
              saleItem.ivaPercentage === null
                ? null
                : new Decimal(saleItem.ivaPercentage);
            ivaAmount = subtotalNet
              .times(ivaPercentage!)
              .dividedBy(100)
              .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
            taxableNet = taxableNet.plus(subtotalNet);
          } else if (taxTreatment === ProductTaxTreatment.EXENTO) {
            exemptAmount = exemptAmount.plus(subtotalNet);
          } else if (taxTreatment === ProductTaxTreatment.NO_GRAVADO) {
            nonTaxedAmount = nonTaxedAmount.plus(subtotalNet);
          }

          const subtotalGross = subtotalNet.plus(ivaAmount);

          totalNet = totalNet.plus(subtotalNet);
          ivaTotal = ivaTotal.plus(ivaAmount);
          totalGross = totalGross.plus(subtotalGross);

          preparedItems.push({
            dto: itemDto,
            saleItem,
            quantity: returnQty,
            unitPriceNet,
            subtotalNet,
            taxTreatment,
            ivaPercentage,
            ivaAmount,
            subtotalGross,
          });
        }

        // 5. Create and save SaleReturn entity
        const saleReturnRepo = manager.getRepository(SaleReturn);
        const saleReturnItemRepo = manager.getRepository(SaleReturnItem);

        const newSaleReturn = saleReturnRepo.create({
          saleId: sale.id,
          userId,
          reason: dto.reason.trim(),
          taxableNet: taxableNet.toFixed(2),
          exemptAmount: exemptAmount.toFixed(2),
          nonTaxedAmount: nonTaxedAmount.toFixed(2),
          totalNet: totalNet.toFixed(2),
          ivaTotal: ivaTotal.toFixed(2),
          totalGross: totalGross.toFixed(2),
          idempotencyKey: dto.idempotencyKey ?? null,
          requestHash,
        });

        const savedSaleReturn = await saleReturnRepo.save(newSaleReturn);

        // 6. Create and save SaleReturnItem entities in request order
        const savedReturnItems: SaleReturnItem[] = [];

        for (const prepared of preparedItems) {
          const returnItem = saleReturnItemRepo.create({
            saleReturnId: savedSaleReturn.id,
            saleItemId: prepared.saleItem.id,
            productId: prepared.saleItem.productId,
            quantityBase: prepared.quantity.toFixed(2),
            quality: prepared.dto.quality,
            unitPriceNet: prepared.unitPriceNet.toFixed(2),
            taxTreatment: prepared.taxTreatment,
            ivaPercentage:
              prepared.ivaPercentage === null
                ? null
                : prepared.ivaPercentage.toFixed(2),
            subtotalNet: prepared.subtotalNet.toFixed(2),
            ivaAmount: prepared.ivaAmount.toFixed(2),
            subtotalGross: prepared.subtotalGross.toFixed(2),
            notes: prepared.dto.notes?.trim() ?? null,
            stockMovementId: null,
          });

          const savedItem = await saleReturnItemRepo.save(returnItem);
          savedReturnItems.push(savedItem);
        }

        // 7. Process physical destination
        for (let i = 0; i < preparedItems.length; i++) {
          const prepared = preparedItems[i];
          const savedItem = savedReturnItems[i];

          if (prepared.dto.quality === SaleReturnItemQuality.APTO) {
            // Re-enters available stock
            const movement = await this.stockService.recordMovement(
              {
                productId: prepared.saleItem.productId,
                movementType: StockMovementType.DEVOLUCION_CLIENTE,
                quantityBase: prepared.quantity.toNumber(),
                reason: `Devolución de cliente venta ${sale.saleNumber}: ${dto.reason.trim()}`,
                documentReference: sale.saleNumber,
                userId,
              },
              manager,
            );

            savedItem.stockMovementId = movement.id;
            await saleReturnItemRepo.save(savedItem);
          } else {
            // NO_APTO -> Enters quarantine directly without modifying available stock
            await this.quarantineService.recordQuarantineFromReturn(manager, {
              productId: prepared.saleItem.productId,
              quantityBase: prepared.quantity.toFixed(2),
              reason: `Devolución cliente ${sale.saleNumber} (NO APTO): ${dto.reason.trim()}`,
              actorId: userId,
              saleReturnItemId: savedItem.id,
            });
          }
        }

        // 8. Fiscal Document stub for Credit Note (if sale was invoiced)
        let fiscalDoc: FiscalDocument | null = null;
        const originalInvoice = (sale.fiscalDocuments ?? []).find(
          (d) => !d.saleReturnId,
        );

        if (sale.requiresFiscalInvoice || originalInvoice) {
          let creditNoteType: FiscalDocumentType | null = null;
          if (originalInvoice?.documentType === FiscalDocumentType.FACTURA_A) {
            creditNoteType = FiscalDocumentType.NOTA_CREDITO_A;
          } else if (
            originalInvoice?.documentType === FiscalDocumentType.FACTURA_B
          ) {
            creditNoteType = FiscalDocumentType.NOTA_CREDITO_B;
          }

          const fiscalRepo = manager.getRepository(FiscalDocument);
          fiscalDoc = await fiscalRepo.save(
            fiscalRepo.create({
              saleId: sale.id,
              saleReturnId: savedSaleReturn.id,
              documentType: creditNoteType,
              pointOfSale: originalInvoice?.pointOfSale ?? null,
              documentNumber: null,
              arcaStatus: ArcaStatus.PENDIENTE_FACTURACION,
            }),
          );
        }

        // 9. Account Receivable compensation movement (if credit sale)
        if (sale.isCreditSale) {
          await this.receivablesService.recordCreditNoteCompensation(manager, {
            saleId: sale.id,
            saleReturnId: savedSaleReturn.id,
            fiscalDocumentId: fiscalDoc?.id ?? null,
            creditNoteAmount: totalGross.toFixed(2),
            userId,
          });
        }

        // 10. Audit log
        await this.auditService.record(manager, {
          actorId: userId,
          action: AuditAction.CREATE,
          entityName: 'SaleReturn',
          entityId: savedSaleReturn.id,
          previousValues: null,
          newValues: {
            saleId: sale.id,
            saleNumber: sale.saleNumber,
            reason: savedSaleReturn.reason,
            totalGross: savedSaleReturn.totalGross,
            totalNet: savedSaleReturn.totalNet,
            ivaTotal: savedSaleReturn.ivaTotal,
            items: savedReturnItems.map((ri) => ({
              id: ri.id,
              saleItemId: ri.saleItemId,
              productId: ri.productId,
              quantityBase: ri.quantityBase,
              quality: ri.quality,
              subtotalGross: ri.subtotalGross,
              stockMovementId: ri.stockMovementId,
            })),
            fiscalDocumentId: fiscalDoc?.id ?? null,
          },
        });

        return savedSaleReturn.id;
      });

      return this.findOneDetail(returnId);
    } catch (error) {
      const databaseCode = this.databaseErrorCode(error);
      if (databaseCode === '40P01' || databaseCode === '40001') {
        throw new ConflictException({
          code: SaleReturnErrorCode.SALE_RETURN_CONCURRENCY_CONFLICT,
          message:
            'La devolución no pudo procesarse debido a un conflicto de concurrencia.',
        });
      }
      throw error;
    }
  }

  async findReturnsBySaleId(saleId: string): Promise<SaleReturnResponseDto[]> {
    const sale = await this.saleRepository.findOne({ where: { id: saleId } });
    if (!sale) {
      throw new NotFoundException({
        code: SaleReturnErrorCode.SALE_RETURN_SALE_NOT_FOUND,
        message: 'La venta especificada no existe.',
      });
    }

    const returns = await this.saleReturnRepository
      .createQueryBuilder('sr')
      .leftJoinAndSelect('sr.user', 'user')
      .leftJoinAndSelect('sr.fiscalDocument', 'fiscalDocument')
      .leftJoinAndSelect('sr.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('items.quarantineStock', 'quarantineStock')
      .where('sr.saleId = :saleId', { saleId })
      .orderBy('sr.createdAt', 'DESC')
      .addOrderBy('sr.id', 'DESC')
      .getMany();

    return returns.map((r) => SaleReturnsMapper.toResponse(r));
  }

  private async findOneDetail(id: string): Promise<SaleReturnResponseDto> {
    const saleReturn = await this.saleReturnRepository
      .createQueryBuilder('sr')
      .leftJoinAndSelect('sr.user', 'user')
      .leftJoinAndSelect('sr.fiscalDocument', 'fiscalDocument')
      .leftJoinAndSelect('sr.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('items.quarantineStock', 'quarantineStock')
      .where('sr.id = :id', { id })
      .getOne();

    if (!saleReturn) {
      throw new NotFoundException('La devolución no fue encontrada.');
    }

    return SaleReturnsMapper.toResponse(saleReturn);
  }

  private validatePayload(dto: CreateSaleReturnDto): void {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException({
        code: SaleReturnErrorCode.SALE_RETURN_NO_ITEMS,
        message: 'La devolución debe contener al menos un ítem.',
      });
    }

    const seen = new Set<string>();
    for (const item of dto.items) {
      if (seen.has(item.saleItemId)) {
        throw new BadRequestException({
          code: SaleReturnErrorCode.SALE_RETURN_DUPLICATE_ITEM,
          message:
            'Un ítem de venta no puede repetirse en la misma devolución.',
          details: { saleItemId: item.saleItemId },
        });
      }
      seen.add(item.saleItemId);

      const qty = Number(item.quantityBase);
      if (isNaN(qty) || qty <= 0) {
        throw new BadRequestException({
          code: SaleReturnErrorCode.SALE_RETURN_INVALID_QUANTITY,
          message: 'La cantidad a devolver debe ser mayor a cero.',
        });
      }
    }
  }

  private computeRequestHash(dto: CreateSaleReturnDto): string {
    const normalized = {
      reason: dto.reason.trim(),
      items: [...dto.items]
        .sort((a, b) => a.saleItemId.localeCompare(b.saleItemId))
        .map((i) => ({
          saleItemId: i.saleItemId,
          quantityBase: new Decimal(i.quantityBase).toFixed(2),
          quality: i.quality,
          notes: i.notes?.trim() || null,
        })),
    };
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(normalized))
      .digest('hex');
  }

  private databaseErrorCode(error: unknown): string | undefined {
    if (!error || typeof error !== 'object') return undefined;
    return (
      (error as { code?: string }).code ??
      (error as { driverError?: { code?: string } }).driverError?.code
    );
  }
}
