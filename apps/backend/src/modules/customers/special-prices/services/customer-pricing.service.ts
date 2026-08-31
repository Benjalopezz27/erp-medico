import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  CustomerPricingErrorCode,
  CustomerPricingRuleApplied,
  CustomerSpecialPriceMode,
  ProductStatus,
} from '@erp/shared-types';
import Decimal from 'decimal.js';
import { DataSource, EntityManager } from 'typeorm';
import { AuditService } from '../../../audit/audit.service';
import { AuthenticatedUser } from '../../../auth/interfaces/authenticated-user.interface';
import { Product } from '../../../products/entities/product.entity';
import { Customer } from '../../entities/customer.entity';
import { CreateCustomerSpecialPriceDto } from '../dto/create-customer-special-price.dto';
import {
  CustomerSpecialPriceResponseDto,
  PaginatedCustomerSpecialPricesResponseDto,
} from '../dto/customer-special-price-response.dto';
import { QueryCustomerSpecialPricesDto } from '../dto/query-customer-special-prices.dto';
import { ResolvedCustomerPriceResponseDto } from '../dto/resolved-customer-price-response.dto';
import { UpdateCustomerSpecialPriceDto } from '../dto/update-customer-special-price.dto';
import { CustomerSpecialPrice } from '../entities/customer-special-price.entity';

type NormalizedRule = {
  specialPriceNet: string | null;
  discountPercentage: string | null;
};

export interface SalePriceResolution {
  productId: string;
  productCode: string;
  productName: string;
  catalogPriceNet: string;
  ruleApplied: CustomerPricingRuleApplied;
  ruleId: string | null;
  discountPercentage: string | null;
  discountAmountNet: string;
  finalPriceNet: string;
  ivaPercentage: string;
}

@Injectable()
export class CustomerPricingService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  async findAllByCustomer(
    customerId: string,
    query: QueryCustomerSpecialPricesDto,
  ): Promise<PaginatedCustomerSpecialPricesResponseDto> {
    const customer = await this.loadCustomer(
      this.dataSource.manager,
      customerId,
    );
    const { page = 1, limit = 10 } = query;
    const qb = this.dataSource.manager
      .createQueryBuilder(CustomerSpecialPrice, 'rule')
      .innerJoinAndSelect('rule.product', 'product')
      .where('rule.customerId = :customerId', { customerId });
    if (query.search) {
      qb.andWhere(
        '(LOWER(product.name) LIKE :search OR LOWER(product.internalCode) LIKE :search)',
        { search: `%${query.search.toLowerCase()}%` },
      );
    }
    qb.orderBy('product.name', 'ASC')
      .addOrderBy('product.internalCode', 'ASC')
      .addOrderBy('rule.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);
    const [rules, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit) || 1;
    return {
      data: rules.map((rule) => this.mapRule(customer, rule)),
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

  async findOne(
    customerId: string,
    id: string,
  ): Promise<CustomerSpecialPriceResponseDto> {
    const customer = await this.loadCustomer(
      this.dataSource.manager,
      customerId,
    );
    const rule = await this.loadRule(this.dataSource.manager, customerId, id);
    return this.mapRule(customer, rule);
  }

  async getFinalPrice(
    customerId: string,
    productId: string,
    manager?: EntityManager,
  ): Promise<ResolvedCustomerPriceResponseDto> {
    if (manager) {
      return this.resolveWithManager(manager, customerId, productId, true);
    }
    return this.dataSource.transaction((transactionManager) =>
      this.resolveWithManager(transactionManager, customerId, productId, true),
    );
  }

  async resolveForSale(
    customerId: string | null,
    productId: string,
    manager: EntityManager,
  ): Promise<SalePriceResolution> {
    if (!manager.queryRunner?.isTransactionActive) {
      throw new Error(
        'CustomerPricingService.resolveForSale requires an active transaction.',
      );
    }

    if (customerId) {
      const resolved = await this.resolveWithManager(
        manager,
        customerId,
        productId,
        true,
      );
      const product = await manager.findOneByOrFail(Product, { id: productId });
      const catalog = new Decimal(resolved.basePriceNet);
      const finalPrice = new Decimal(resolved.finalPriceNet);
      return {
        productId: resolved.productId,
        productCode: resolved.productCode,
        productName: resolved.productName,
        catalogPriceNet: catalog.toFixed(2),
        ruleApplied: resolved.ruleApplied,
        ruleId: resolved.ruleId,
        discountPercentage: resolved.discountPercentage,
        discountAmountNet: Decimal.max(0, catalog.minus(finalPrice)).toFixed(2),
        finalPriceNet: finalPrice.toFixed(2),
        ivaPercentage: new Decimal(product.ivaPercentage).toFixed(2),
      };
    }

    const product = await this.loadProduct(manager, productId, true, true);
    const catalog = new Decimal(product.activePriceNet).toDecimalPlaces(
      2,
      Decimal.ROUND_HALF_UP,
    );
    return {
      productId: product.id,
      productCode: product.internalCode,
      productName: product.name,
      catalogPriceNet: catalog.toFixed(2),
      ruleApplied: CustomerPricingRuleApplied.CATALOG_PRICE,
      ruleId: null,
      discountPercentage: null,
      discountAmountNet: '0.00',
      finalPriceNet: catalog.toFixed(2),
      ivaPercentage: new Decimal(product.ivaPercentage).toFixed(2),
    };
  }

  createSpecialPrice(
    customerId: string,
    dto: CreateCustomerSpecialPriceDto,
    actor: AuthenticatedUser,
  ): Promise<CustomerSpecialPriceResponseDto> {
    return this.executeWrite(
      async (manager) => {
        const customer = await this.loadCustomer(
          manager,
          customerId,
          true,
          true,
        );
        const product = await this.loadProduct(
          manager,
          dto.productId,
          true,
          true,
        );
        const repo = manager.getRepository(CustomerSpecialPrice);
        const existing = await repo.findOne({
          where: { customerId, productId: dto.productId },
        });
        if (existing) this.throwDuplicate(customerId, dto.productId);
        const normalized = this.normalizeRule(dto);
        const saved = await repo.save(
          repo.create({
            customerId,
            productId: dto.productId,
            ...normalized,
          }),
        );
        await this.auditService.record(manager, {
          actorId: actor.id,
          action: AuditAction.CREATE,
          entityName: 'CustomerSpecialPrice',
          entityId: saved.id,
          previousValues: null,
          newValues: this.ruleSnapshot(saved),
        });
        saved.product = product;
        return this.mapRule(customer, saved);
      },
      { customerId, productId: dto.productId },
    );
  }

  updateSpecialPrice(
    customerId: string,
    id: string,
    dto: UpdateCustomerSpecialPriceDto,
    actor: AuthenticatedUser,
  ): Promise<CustomerSpecialPriceResponseDto> {
    return this.executeWrite(async (manager) => {
      const customer = await this.loadCustomer(manager, customerId, true, true);
      const initial = await this.loadRule(manager, customerId, id);
      const product = await this.loadProduct(
        manager,
        initial.productId,
        true,
        true,
      );
      const rule = await this.loadRule(manager, customerId, id, true);
      if (dto.expectedVersion !== rule.version) {
        throw new ConflictException({
          code: CustomerPricingErrorCode.CUSTOMER_SPECIAL_PRICE_CONCURRENCY_CONFLICT,
          message:
            'La condición fue modificada desde la última lectura. Actualice los datos e intente nuevamente.',
          details: { currentRule: this.mapRule(customer, rule) },
        });
      }
      const normalized = this.normalizeRule(dto);
      const unchanged =
        this.decimalsEqual(rule.specialPriceNet, normalized.specialPriceNet) &&
        this.decimalsEqual(
          rule.discountPercentage,
          normalized.discountPercentage,
        );
      if (unchanged) {
        throw new BadRequestException({
          code: CustomerPricingErrorCode.CUSTOMER_SPECIAL_PRICE_NO_EFFECTIVE_CHANGES,
          message:
            'No se detectaron cambios efectivos en la condición especial.',
        });
      }
      const previousValues = this.ruleSnapshot(rule);
      Object.assign(rule, normalized);
      const saved = await manager.save(CustomerSpecialPrice, rule);
      await this.auditService.record(manager, {
        actorId: actor.id,
        action: AuditAction.UPDATE,
        entityName: 'CustomerSpecialPrice',
        entityId: saved.id,
        previousValues,
        newValues: this.ruleSnapshot(saved),
      });
      saved.product = product;
      return this.mapRule(customer, saved);
    });
  }

  async deleteSpecialPrice(
    customerId: string,
    id: string,
    actor: AuthenticatedUser,
  ): Promise<void> {
    await this.executeWrite(async (manager) => {
      await this.loadCustomer(manager, customerId, true);
      const initial = await this.loadRule(manager, customerId, id);
      await this.loadProduct(manager, initial.productId, true);
      const rule = await this.loadRule(manager, customerId, id, true);
      const removedId = rule.id;
      const previousValues = this.ruleSnapshot(rule);
      await manager.remove(CustomerSpecialPrice, rule);
      await this.auditService.record(manager, {
        actorId: actor.id,
        action: AuditAction.DELETE,
        entityName: 'CustomerSpecialPrice',
        entityId: removedId,
        previousValues,
        newValues: null,
      });
    });
  }

  private async resolveWithManager(
    manager: EntityManager,
    customerId: string,
    productId: string,
    lock: boolean,
  ): Promise<ResolvedCustomerPriceResponseDto> {
    const customer = await this.loadCustomer(manager, customerId, lock, true);
    const product = await this.loadProduct(manager, productId, lock, true);
    const rule = await manager.findOne(CustomerSpecialPrice, {
      where: { customerId, productId },
    });
    return this.resolve(customer, product, rule);
  }

  private resolve(
    customer: Customer,
    product: Product,
    rule: CustomerSpecialPrice | null,
  ): ResolvedCustomerPriceResponseDto {
    const basePrice = new Decimal(product.activePriceNet).toDecimalPlaces(
      2,
      Decimal.ROUND_HALF_UP,
    );
    if (rule?.specialPriceNet !== null && rule?.specialPriceNet !== undefined) {
      return this.resolvedResponse(
        customer,
        product,
        basePrice,
        new Decimal(rule.specialPriceNet).toDecimalPlaces(
          2,
          Decimal.ROUND_HALF_UP,
        ),
        CustomerPricingRuleApplied.FIXED_PRICE,
        rule.id,
        null,
      );
    }
    if (
      rule?.discountPercentage !== null &&
      rule?.discountPercentage !== undefined
    ) {
      return this.discountedResponse(
        customer,
        product,
        basePrice,
        new Decimal(rule.discountPercentage),
        CustomerPricingRuleApplied.PRODUCT_DISCOUNT,
        rule.id,
      );
    }
    const generalDiscount = new Decimal(
      customer.generalDiscountPercentage ?? 0,
    );
    if (generalDiscount.gt(0)) {
      return this.discountedResponse(
        customer,
        product,
        basePrice,
        generalDiscount,
        CustomerPricingRuleApplied.GENERAL_DISCOUNT,
        null,
      );
    }
    return this.resolvedResponse(
      customer,
      product,
      basePrice,
      basePrice,
      CustomerPricingRuleApplied.CATALOG_PRICE,
      null,
      null,
    );
  }

  private discountedResponse(
    customer: Customer,
    product: Product,
    basePrice: Decimal,
    percentage: Decimal,
    ruleApplied: CustomerPricingRuleApplied,
    ruleId: string | null,
  ): ResolvedCustomerPriceResponseDto {
    const finalPrice = Decimal.max(
      0,
      basePrice.times(new Decimal(1).minus(percentage.dividedBy(100))),
    ).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    return this.resolvedResponse(
      customer,
      product,
      basePrice,
      finalPrice,
      ruleApplied,
      ruleId,
      percentage.toFixed(4),
    );
  }

  private resolvedResponse(
    customer: Customer,
    product: Product,
    basePrice: Decimal,
    finalPrice: Decimal,
    ruleApplied: CustomerPricingRuleApplied,
    ruleId: string | null,
    discountPercentage: string | null,
  ): ResolvedCustomerPriceResponseDto {
    return {
      customerId: customer.id,
      customerBusinessName: customer.businessName,
      productId: product.id,
      productCode: product.internalCode,
      productName: product.name,
      basePriceNet: basePrice.toFixed(2),
      ruleApplied,
      ruleId,
      discountPercentage,
      discountAmountNet:
        discountPercentage === null
          ? null
          : basePrice.minus(finalPrice).toFixed(2),
      finalPriceNet: finalPrice.toFixed(2),
    };
  }

  private mapRule(
    customer: Customer,
    rule: CustomerSpecialPrice,
  ): CustomerSpecialPriceResponseDto {
    if (!rule.product) {
      throw new Error(
        'Customer special price product relation was not loaded.',
      );
    }
    const resolved = this.resolve(customer, rule.product, rule);
    return {
      id: rule.id,
      customerId: rule.customerId,
      productId: rule.productId,
      productCode: rule.product.internalCode,
      productName: rule.product.name,
      activeCatalogPriceNet: resolved.basePriceNet,
      mode:
        rule.specialPriceNet !== null
          ? CustomerSpecialPriceMode.FIXED_PRICE
          : CustomerSpecialPriceMode.DISCOUNT_PERCENTAGE,
      specialPriceNet:
        rule.specialPriceNet === null
          ? null
          : new Decimal(rule.specialPriceNet).toFixed(2),
      discountPercentage:
        rule.discountPercentage === null
          ? null
          : new Decimal(rule.discountPercentage).toFixed(4),
      finalPriceNet: resolved.finalPriceNet,
      version: rule.version,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }

  private normalizeRule(input: {
    mode: CustomerSpecialPriceMode;
    specialPriceNet?: string;
    discountPercentage?: string;
  }): NormalizedRule {
    if (
      input.mode === CustomerSpecialPriceMode.FIXED_PRICE &&
      input.specialPriceNet !== undefined &&
      input.discountPercentage === undefined
    ) {
      return {
        specialPriceNet: this.normalizePrice(input.specialPriceNet),
        discountPercentage: null,
      };
    }
    if (
      input.mode === CustomerSpecialPriceMode.DISCOUNT_PERCENTAGE &&
      input.discountPercentage !== undefined &&
      input.specialPriceNet === undefined
    ) {
      return {
        specialPriceNet: null,
        discountPercentage: this.normalizeDiscount(input.discountPercentage),
      };
    }
    throw new BadRequestException({
      code: CustomerPricingErrorCode.CUSTOMER_SPECIAL_PRICE_INVALID_MODE,
      message:
        'Debe indicar exactamente una modalidad y su valor correspondiente.',
    });
  }

  private normalizePrice(value: string): string {
    let decimal: Decimal;
    try {
      decimal = new Decimal(value);
    } catch {
      decimal = new Decimal(-1);
    }
    if (
      !decimal.isFinite() ||
      decimal.lt(0) ||
      decimal.gt('999999999999.99') ||
      decimal.decimalPlaces() > 2
    ) {
      throw new BadRequestException({
        code: CustomerPricingErrorCode.CUSTOMER_SPECIAL_PRICE_INVALID_PRICE,
        message:
          'El precio fijo debe ser no negativo y tener hasta dos decimales.',
      });
    }
    return decimal.toFixed(2);
  }

  private normalizeDiscount(value: string): string {
    let decimal: Decimal;
    try {
      decimal = new Decimal(value);
    } catch {
      decimal = new Decimal(-1);
    }
    if (
      !decimal.isFinite() ||
      decimal.lt(0) ||
      decimal.gt(100) ||
      decimal.decimalPlaces() > 4
    ) {
      throw new BadRequestException({
        code: CustomerPricingErrorCode.CUSTOMER_SPECIAL_PRICE_INVALID_DISCOUNT,
        message:
          'El descuento debe estar entre 0 y 100 con hasta cuatro decimales.',
      });
    }
    return decimal.toFixed(4);
  }

  private async loadCustomer(
    manager: EntityManager,
    id: string,
    lock = false,
    requireActive = false,
  ): Promise<Customer> {
    const qb = manager
      .createQueryBuilder(Customer, 'customer')
      .where('customer.id = :id', { id });
    if (lock) qb.setLock('pessimistic_write', undefined, ['customer']);
    const customer = await qb.getOne();
    if (!customer) {
      throw new NotFoundException({
        code: CustomerPricingErrorCode.CUSTOMER_PRICING_CUSTOMER_NOT_FOUND,
        message: 'El cliente no existe.',
        details: { customerId: id },
      });
    }
    if (requireActive && !customer.isActive) {
      throw new ConflictException({
        code: CustomerPricingErrorCode.CUSTOMER_PRICING_CUSTOMER_INACTIVE,
        message: 'No se pueden aplicar condiciones a un cliente inactivo.',
        details: { customerId: id },
      });
    }
    return customer;
  }

  private async loadProduct(
    manager: EntityManager,
    id: string,
    lock = false,
    requireActive = false,
  ): Promise<Product> {
    const qb = manager
      .createQueryBuilder(Product, 'product')
      .where('product.id = :id', { id });
    if (lock) qb.setLock('pessimistic_write', undefined, ['product']);
    const product = await qb.getOne();
    if (!product) {
      throw new NotFoundException({
        code: CustomerPricingErrorCode.CUSTOMER_PRICING_PRODUCT_NOT_FOUND,
        message: 'El producto no existe.',
        details: { productId: id },
      });
    }
    if (requireActive && product.status !== ProductStatus.ACTIVE) {
      throw new ConflictException({
        code: CustomerPricingErrorCode.CUSTOMER_PRICING_PRODUCT_INACTIVE,
        message: 'No se pueden aplicar condiciones a un producto inactivo.',
        details: { productId: id },
      });
    }
    return product;
  }

  private async loadRule(
    manager: EntityManager,
    customerId: string,
    id: string,
    lock = false,
  ): Promise<CustomerSpecialPrice> {
    const qb = manager
      .createQueryBuilder(CustomerSpecialPrice, 'rule')
      .innerJoinAndSelect('rule.product', 'product')
      .where('rule.id = :id', { id })
      .andWhere('rule.customerId = :customerId', { customerId });
    if (lock) qb.setLock('pessimistic_write', undefined, ['rule']);
    const rule = await qb.getOne();
    if (!rule) {
      throw new NotFoundException({
        code: CustomerPricingErrorCode.CUSTOMER_SPECIAL_PRICE_NOT_FOUND,
        message: 'La condición especial no existe para el cliente indicado.',
        details: { customerId, ruleId: id },
      });
    }
    return rule;
  }

  private executeWrite<T>(
    operation: (manager: EntityManager) => Promise<T>,
    duplicateDetails?: { customerId: string; productId: string },
  ): Promise<T> {
    return this.dataSource.transaction(operation).catch((error) => {
      const code = this.databaseErrorCode(error);
      if (code === '23505' && duplicateDetails) {
        this.throwDuplicate(
          duplicateDetails.customerId,
          duplicateDetails.productId,
        );
      }
      if (code === '40P01' || code === '40001') {
        throw new ConflictException({
          code: CustomerPricingErrorCode.CUSTOMER_SPECIAL_PRICE_CONCURRENCY_CONFLICT,
          message:
            'La condición fue modificada simultáneamente. Actualice los datos e intente nuevamente.',
        });
      }
      throw error;
    });
  }

  private throwDuplicate(customerId: string, productId: string): never {
    throw new ConflictException({
      code: CustomerPricingErrorCode.CUSTOMER_SPECIAL_PRICE_ALREADY_EXISTS,
      message: 'Ya existe una condición especial para ese cliente y producto.',
      details: { customerId, productId },
    });
  }

  private ruleSnapshot(rule: CustomerSpecialPrice): Record<string, unknown> {
    return {
      customerId: rule.customerId,
      productId: rule.productId,
      specialPriceNet:
        rule.specialPriceNet === null
          ? null
          : new Decimal(rule.specialPriceNet).toFixed(2),
      discountPercentage:
        rule.discountPercentage === null
          ? null
          : new Decimal(rule.discountPercentage).toFixed(4),
      version: rule.version,
    };
  }

  private decimalsEqual(left: string | null, right: string | null): boolean {
    if (left === null || right === null) return left === right;
    return new Decimal(left).eq(right);
  }

  private databaseErrorCode(error: unknown): string | undefined {
    if (!error || typeof error !== 'object') return undefined;
    return (
      (error as { code?: string }).code ??
      (error as { driverError?: { code?: string } }).driverError?.code
    );
  }
}
