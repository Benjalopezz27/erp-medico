import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ArcaStatus,
  AuditAction,
  PaymentMethod,
  ProductTaxTreatment,
  SaleStatus,
  SalesErrorCode,
  StockMovementType,
} from '@erp/shared-types';
import Decimal from 'decimal.js';
import { DataSource, EntityManager } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { CustomerPricingService } from '../customers/special-prices/services/customer-pricing.service';
import { AccountReceivable } from '../receivables/entities/account-receivable.entity';
import { ReceivablesService } from '../receivables/receivables.service';
import { StockService } from '../stock/stock.service';
import {
  CreateSaleDto,
  PaginatedSalesResponseDto,
  QuerySalesDto,
  SaleResponseDto,
} from './dto';
import { FiscalDocument } from './entities/fiscal-document.entity';
import { SaleItem } from './entities/sale-item.entity';
import { Sale } from './entities/sale.entity';
import { SalesMapper } from './mappers/sales.mapper';

@Injectable()
export class SalesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly customerPricingService: CustomerPricingService,
    private readonly stockService: StockService,
    private readonly receivablesService: ReceivablesService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateSaleDto, userId: string): Promise<SaleResponseDto> {
    this.validateCommercialContract(dto);
    this.validateAuthoritativeFields(dto);
    this.validateUniqueProducts(dto);
    const orderedItems = dto.items
      .map((item, itemIndex) => ({ ...item, itemIndex }))
      .sort((left, right) => left.productId.localeCompare(right.productId));

    try {
      return await this.dataSource.transaction(async (manager) => {
        const saleNumber = await this.nextSaleNumber(manager);
        const saleRepository = manager.getRepository(Sale);
        const itemRepository = manager.getRepository(SaleItem);
        const fiscalRepository = manager.getRepository(FiscalDocument);

        let sale = await saleRepository.save(
          saleRepository.create({
            saleNumber,
            customerId: dto.customerId ?? null,
            status: SaleStatus.BORRADOR,
            isCreditSale: dto.isCreditSale,
            requiresFiscalInvoice: dto.requiresFiscalInvoice,
            paymentMethod: dto.paymentMethod,
            totalNet: '0.00',
            taxableNet: '0.00',
            exemptAmount: '0.00',
            nonTaxedAmount: '0.00',
            ivaTotal: '0.00',
            totalGross: '0.00',
            userId,
          }),
        );

        let totalNet = new Decimal(0);
        let taxableNet = new Decimal(0);
        let exemptAmount = new Decimal(0);
        let nonTaxedAmount = new Decimal(0);
        let ivaTotal = new Decimal(0);
        let totalGross = new Decimal(0);
        const savedItems: SaleItem[] = [];

        for (const item of orderedItems) {
          const price = await this.customerPricingService.resolveForSale(
            dto.customerId ?? null,
            item.productId,
            manager,
          );
          const quantity = new Decimal(item.quantityBase);
          const catalogPrice = new Decimal(price.catalogPriceNet);
          const unitPrice = new Decimal(price.finalPriceNet).toDecimalPlaces(
            2,
            Decimal.ROUND_HALF_UP,
          );
          const subtotalNet = unitPrice
            .times(quantity)
            .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
          const ivaPercentage =
            price.ivaPercentage === null
              ? null
              : new Decimal(price.ivaPercentage);
          const ivaAmount =
            price.taxTreatment === ProductTaxTreatment.GRAVADO
              ? subtotalNet
                  .times(ivaPercentage!)
                  .dividedBy(100)
                  .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
              : new Decimal(0);
          const subtotalGross = subtotalNet
            .plus(ivaAmount)
            .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

          await this.stockService.recordMovement(
            {
              productId: item.productId,
              movementType: StockMovementType.SALIDA_VENTA,
              quantityBase: item.quantityBase,
              reason: `Venta ${saleNumber}`,
              documentReference: saleNumber,
              userId,
            },
            manager,
          );

          savedItems.push(
            await itemRepository.save(
              itemRepository.create({
                saleId: sale.id,
                productId: item.productId,
                itemIndex: item.itemIndex,
                quantityBase: quantity.toFixed(2),
                catalogPriceNet: catalogPrice.toFixed(2),
                pricingRuleApplied: price.ruleApplied,
                pricingRuleId: price.ruleId,
                discountPercentage: price.discountPercentage,
                discountAmountNet: price.discountAmountNet,
                unitPriceNet: unitPrice.toFixed(2),
                subtotalNet: subtotalNet.toFixed(2),
                taxTreatment: price.taxTreatment,
                ivaPercentage: ivaPercentage?.toFixed(2) ?? null,
                ivaAmount: ivaAmount.toFixed(2),
                subtotalGross: subtotalGross.toFixed(2),
              }),
            ),
          );
          totalNet = totalNet.plus(subtotalNet);
          if (price.taxTreatment === ProductTaxTreatment.GRAVADO) {
            taxableNet = taxableNet.plus(subtotalNet);
          } else if (price.taxTreatment === ProductTaxTreatment.EXENTO) {
            exemptAmount = exemptAmount.plus(subtotalNet);
          } else {
            nonTaxedAmount = nonTaxedAmount.plus(subtotalNet);
          }
          ivaTotal = ivaTotal.plus(ivaAmount);
          totalGross = totalGross.plus(subtotalGross);
        }

        let fiscalDocument: FiscalDocument | null = null;
        if (dto.requiresFiscalInvoice) {
          fiscalDocument = await fiscalRepository.save(
            fiscalRepository.create({
              saleId: sale.id,
              documentType: null,
              pointOfSale: null,
              documentNumber: null,
              cae: null,
              caeExpirationDate: null,
              arcaStatus: ArcaStatus.PENDIENTE_FACTURACION,
              arcaErrorMessage: null,
              qrCodeData: null,
              issuedAt: null,
            }),
          );
        }

        let accountReceivable: AccountReceivable | null = null;
        if (dto.isCreditSale) {
          accountReceivable =
            await this.receivablesService.recordCreditSaleDebt(manager, {
              customerId: dto.customerId!,
              saleId: sale.id,
              fiscalDocumentId: fiscalDocument!.id,
              saleNumber,
              totalGross: totalGross.toFixed(2),
            });
        }

        sale.totalNet = totalNet.toFixed(2);
        sale.taxableNet = taxableNet.toFixed(2);
        sale.exemptAmount = exemptAmount.toFixed(2);
        sale.nonTaxedAmount = nonTaxedAmount.toFixed(2);
        sale.ivaTotal = ivaTotal.toFixed(2);
        sale.totalGross = totalGross.toFixed(2);
        sale.status = SaleStatus.CONFIRMADA;
        sale = await saleRepository.save(sale);

        await this.auditService.record(manager, {
          actorId: userId,
          action: AuditAction.CREATE,
          entityName: 'Sale',
          entityId: sale.id,
          previousValues: null,
          newValues: {
            saleNumber,
            customerId: sale.customerId,
            status: sale.status,
            isCreditSale: sale.isCreditSale,
            requiresFiscalInvoice: sale.requiresFiscalInvoice,
            paymentMethod: sale.paymentMethod,
            totalNet: sale.totalNet,
            taxableNet: sale.taxableNet,
            exemptAmount: sale.exemptAmount,
            nonTaxedAmount: sale.nonTaxedAmount,
            ivaTotal: sale.ivaTotal,
            totalGross: sale.totalGross,
            fiscalDocumentId: fiscalDocument?.id ?? null,
            accountReceivableId: accountReceivable?.id ?? null,
            items: savedItems.map((savedItem) => ({
              id: savedItem.id,
              productId: savedItem.productId,
              quantityBase: savedItem.quantityBase,
              pricingRuleApplied: savedItem.pricingRuleApplied,
              unitPriceNet: savedItem.unitPriceNet,
              taxTreatment: savedItem.taxTreatment,
              ivaPercentage: savedItem.ivaPercentage,
            })),
          },
        });

        return this.loadDetail(manager, sale.id);
      });
    } catch (error) {
      const databaseCode = this.databaseErrorCode(error);
      if (databaseCode === '40P01' || databaseCode === '40001') {
        throw new ConflictException({
          code: SalesErrorCode.SALE_CONCURRENCY_CONFLICT,
          message:
            'La venta no pudo confirmarse por una modificación concurrente.',
        });
      }
      throw error;
    }
  }

  async findAll(query: QuerySalesDto): Promise<PaginatedSalesResponseDto> {
    this.validateDateRange(query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const qb = this.dataSource.getRepository(Sale).createQueryBuilder('sale');
    if (query.from)
      qb.andWhere('sale.createdAt >= :from', { from: query.from });
    if (query.to) qb.andWhere('sale.createdAt <= :to', { to: query.to });
    if (query.customerId)
      qb.andWhere('sale.customerId = :customerId', {
        customerId: query.customerId,
      });
    if (query.status)
      qb.andWhere('sale.status = :status', { status: query.status });
    qb.orderBy('sale.createdAt', 'DESC').addOrderBy('sale.id', 'DESC');
    qb.skip((page - 1) * limit).take(limit);
    const [sales, total] = await qb.getManyAndCount();
    const data = await Promise.all(
      sales.map((sale) => this.loadDetail(this.dataSource.manager, sale.id)),
    );
    const totalPages = Math.ceil(total / limit) || 1;
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  findOne(id: string): Promise<SaleResponseDto> {
    return this.loadDetail(this.dataSource.manager, id);
  }

  private validateCommercialContract(dto: CreateSaleDto): void {
    if (dto.isCreditSale && !dto.customerId) {
      throw new BadRequestException({
        code: SalesErrorCode.SALE_CREDIT_REQUIRES_CUSTOMER,
        message: 'La venta a crédito requiere un cliente.',
      });
    }
    if (dto.isCreditSale && !dto.requiresFiscalInvoice) {
      throw new BadRequestException({
        code: SalesErrorCode.SALE_CREDIT_REQUIRES_INVOICE,
        message: 'La venta a crédito requiere factura.',
      });
    }
    if (dto.isCreditSale && dto.paymentMethod !== PaymentMethod.CTA_CTE) {
      throw new BadRequestException({
        code: SalesErrorCode.SALE_CREDIT_REQUIRES_CURRENT_ACCOUNT,
        message: 'La venta a crédito debe registrarse en cuenta corriente.',
      });
    }
    if (!dto.isCreditSale && dto.paymentMethod === PaymentMethod.CTA_CTE) {
      throw new BadRequestException({
        code: SalesErrorCode.SALE_CASH_INVALID_CURRENT_ACCOUNT,
        message: 'Una venta de contado no puede usar cuenta corriente.',
      });
    }
  }

  private validateUniqueProducts(dto: CreateSaleDto): void {
    const seen = new Set<string>();
    for (const item of dto.items) {
      if (seen.has(item.productId)) {
        throw new BadRequestException({
          code: SalesErrorCode.SALE_DUPLICATE_PRODUCT,
          message: 'Un producto no puede repetirse en la misma venta.',
          details: { productId: item.productId },
        });
      }
      seen.add(item.productId);
    }
  }

  private validateAuthoritativeFields(dto: CreateSaleDto): void {
    const saleFields = [
      dto.totalNet,
      dto.taxableNet,
      dto.exemptAmount,
      dto.nonTaxedAmount,
      dto.ivaTotal,
      dto.totalGross,
    ];
    const itemHasAuthoritativeField = dto.items.some((item) =>
      [
        item.unitPriceNet,
        item.catalogPriceNet,
        item.discountPercentage,
        item.discountAmountNet,
        item.subtotalNet,
        item.taxTreatment,
        item.ivaPercentage,
        item.ivaAmount,
        item.subtotalGross,
      ].some((value) => value !== undefined),
    );
    if (
      saleFields.some((value) => value !== undefined) ||
      itemHasAuthoritativeField
    ) {
      throw new BadRequestException({
        code: SalesErrorCode.SALE_PRICE_FIELDS_NOT_ALLOWED,
        message:
          'Los precios, descuentos, impuestos y totales son calculados por el backend.',
      });
    }
  }

  private validateDateRange(query: QuerySalesDto): void {
    if (query.from && query.to && new Date(query.from) > new Date(query.to)) {
      throw new BadRequestException({
        code: SalesErrorCode.SALE_INVALID_DATE_RANGE,
        message: "La fecha 'from' no puede ser posterior a 'to'.",
      });
    }
  }

  private async nextSaleNumber(manager: EntityManager): Promise<string> {
    const [result] = await manager.query(
      `SELECT 'V-' || LPAD(nextval('sale_number_seq')::text, 8, '0') AS "saleNumber"`,
    );
    return result.saleNumber;
  }

  private async loadDetail(
    manager: EntityManager,
    id: string,
  ): Promise<SaleResponseDto> {
    const sale = await manager
      .getRepository(Sale)
      .createQueryBuilder('sale')
      .leftJoinAndSelect('sale.customer', 'customer')
      .innerJoinAndSelect('sale.user', 'user')
      .leftJoinAndSelect('sale.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('sale.fiscalDocument', 'fiscalDocument')
      .where('sale.id = :id', { id })
      .orderBy('items.itemIndex', 'ASC')
      .getOne();
    if (!sale) {
      throw new NotFoundException({
        code: SalesErrorCode.SALE_NOT_FOUND,
        message: 'La venta no existe.',
      });
    }
    const accountReceivable = await manager
      .getRepository(AccountReceivable)
      .findOne({ where: { saleId: id } });
    return SalesMapper.toResponse(sale, accountReceivable);
  }

  private databaseErrorCode(error: unknown): string | undefined {
    if (!error || typeof error !== 'object') return undefined;
    return (
      (error as { code?: string }).code ??
      (error as { driverError?: { code?: string } }).driverError?.code
    );
  }
}
