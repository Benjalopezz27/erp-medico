import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, QueryFailedError } from 'typeorm';
import Decimal from 'decimal.js';
import {
  AuditAction,
  IMarkupConfiguration,
  IMarkupSimulation,
  MarkupErrorCode,
  MarkupLevel,
  ProductStatus,
} from '@erp/shared-types';
import { AuditService } from '../audit/audit.service';
import { Category } from '../categories/entities/category.entity';
import { Product } from '../products/entities/product.entity';
import { CreateMarkupConfigurationDto } from './dto/create-markup-configuration.dto';
import { UpdateMarkupConfigurationDto } from './dto/update-markup-configuration.dto';
import { MarkupConfiguration } from './entities/markup-configuration.entity';
import { MarkupEngineService } from './services/markup-engine.service';

@Injectable()
export class PricesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    private readonly engine: MarkupEngineService,
  ) {}

  getStatus(): { module: string; status: string } {
    return { module: 'prices', status: 'initialized' };
  }

  calculateSuggestedPrice(
    costNet: string | number,
    percentage: string | number,
  ): string {
    return this.engine.calculateSuggestedPrice(costNet, percentage);
  }

  async findAll(): Promise<IMarkupConfiguration[]> {
    const rows = await this.dataSource.manager
      .createQueryBuilder(MarkupConfiguration, 'markup')
      .leftJoinAndSelect('markup.category', 'category')
      .leftJoinAndSelect('markup.product', 'product')
      .orderBy(
        `CASE markup.level WHEN '${MarkupLevel.GLOBAL}' THEN 1 WHEN '${MarkupLevel.CATEGORY}' THEN 2 ELSE 3 END`,
        'ASC',
      )
      .addOrderBy('category.name', 'ASC')
      .addOrderBy('product.name', 'ASC')
      .addOrderBy('markup.id', 'ASC')
      .getMany();
    return rows.map((row) => this.map(row));
  }

  async create(
    dto: CreateMarkupConfigurationDto,
    userId: string,
  ): Promise<IMarkupConfiguration> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        await this.lockTarget(
          manager,
          dto.level,
          dto.categoryId,
          dto.productId,
        );
        await this.validateTarget(
          manager,
          dto.level,
          dto.categoryId,
          dto.productId,
        );
        const percentage = this.normalizePercentage(dto.percentage);
        const saved = await manager.save(
          MarkupConfiguration,
          manager.create(MarkupConfiguration, {
            level: dto.level,
            percentage,
            categoryId:
              dto.level === MarkupLevel.CATEGORY ? dto.categoryId! : null,
            productId:
              dto.level === MarkupLevel.PRODUCT ? dto.productId! : null,
          }),
        );
        await this.auditService.record(manager, {
          actorId: userId,
          action: AuditAction.CREATE,
          entityName: 'MarkupConfiguration',
          entityId: saved.id,
          previousValues: null,
          newValues: {
            level: saved.level,
            percentage,
            categoryId: saved.categoryId,
            productId: saved.productId,
          },
        });
        await this.recalculateAffected(manager, saved);
        return this.map(await this.load(manager, saved.id));
      });
    } catch (error) {
      this.translateUnique(error);
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdateMarkupConfigurationDto,
    userId: string,
  ): Promise<IMarkupConfiguration> {
    return this.dataSource.transaction(async (manager) => {
      const entity = await this.load(manager, id, true);
      const percentage = this.normalizePercentage(dto.percentage);
      const previous = new Decimal(entity.percentage).toFixed(4);
      if (previous === percentage) return this.map(entity);
      entity.percentage = percentage;
      await manager.save(MarkupConfiguration, entity);
      await this.auditService.record(manager, {
        actorId: userId,
        action: AuditAction.UPDATE,
        entityName: 'MarkupConfiguration',
        entityId: entity.id,
        previousValues: { percentage: previous },
        newValues: { percentage },
      });
      await this.recalculateAffected(manager, entity);
      return this.map(await this.load(manager, id));
    });
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const entity = await this.load(manager, id, true);
      if (entity.level === MarkupLevel.GLOBAL)
        throw new BadRequestException({
          code: MarkupErrorCode.MARKUP_GLOBAL_CANNOT_BE_DELETED,
          message: 'La configuración global solo puede actualizarse.',
        });
      const previousValues = {
        level: entity.level,
        percentage: new Decimal(entity.percentage).toFixed(4),
        categoryId: entity.categoryId,
        productId: entity.productId,
      };
      await manager.remove(MarkupConfiguration, entity);
      await this.auditService.record(manager, {
        actorId: userId,
        action: AuditAction.DELETE,
        entityName: 'MarkupConfiguration',
        entityId: id,
        previousValues,
        newValues: null,
      });
      await this.recalculateAffected(manager, entity);
    });
  }

  async simulate(productId: string): Promise<IMarkupSimulation> {
    const product = await this.dataSource.manager.findOne(Product, {
      where: { id: productId },
      relations: { category: true },
    });
    if (!product) this.throwTargetNotFound('El producto indicado no existe.');
    const effectiveMarkup = await this.engine.resolveForProduct(
      product,
      this.dataSource.manager,
    );
    return {
      productId: product.id,
      productCode: product.internalCode,
      productName: product.name,
      costNet: new Decimal(product.costNet).toFixed(4),
      effectiveMarkup,
      suggestedPriceNet: this.engine.calculateSuggestedPrice(
        product.costNet,
        effectiveMarkup.percentage,
      ),
    };
  }

  async applyLegacyProductMarkup(
    manager: EntityManager,
    product: Product,
    value: number | null,
    userId?: string,
  ): Promise<boolean> {
    await this.lockTarget(manager, MarkupLevel.PRODUCT, null, product.id);
    const existing = await manager.findOne(MarkupConfiguration, {
      where: { level: MarkupLevel.PRODUCT, productId: product.id },
    });
    if (value === null) {
      if (existing) {
        const removedId = existing.id;
        const previousValues = {
          level: existing.level,
          percentage: existing.percentage,
          productId: product.id,
        };
        await manager.remove(MarkupConfiguration, existing);
        if (userId)
          await this.auditService.record(manager, {
            actorId: userId,
            action: AuditAction.DELETE,
            entityName: 'MarkupConfiguration',
            entityId: removedId,
            previousValues,
            newValues: null,
          });
      }
      return existing !== null;
    }
    const percentage = this.normalizePercentage(String(value));
    const entity =
      existing ??
      manager.create(MarkupConfiguration, {
        level: MarkupLevel.PRODUCT,
        categoryId: null,
        productId: product.id,
        percentage,
      });
    const previous = existing
      ? new Decimal(existing.percentage).toFixed(4)
      : null;
    entity.percentage = percentage;
    if (existing && previous === percentage) return false;
    const saved = await manager.save(MarkupConfiguration, entity);
    if (userId && previous !== percentage)
      await this.auditService.record(manager, {
        actorId: userId,
        action: existing ? AuditAction.UPDATE : AuditAction.CREATE,
        entityName: 'MarkupConfiguration',
        entityId: saved.id,
        previousValues: previous === null ? null : { percentage: previous },
        newValues: {
          level: MarkupLevel.PRODUCT,
          percentage,
          productId: product.id,
        },
      });
    return true;
  }

  async hydrateLegacyMarkup(
    product: Product,
    manager: EntityManager = this.dataSource.manager,
  ): Promise<Product> {
    product.markupPercentage = (
      await this.engine.resolveForProduct(product, manager)
    ).percentage;
    return product;
  }

  private normalizePercentage(value: string): string {
    let parsed: Decimal;
    try {
      parsed = new Decimal(value);
    } catch {
      parsed = new Decimal(-1);
    }
    if (
      !parsed.isFinite() ||
      parsed.lt(0) ||
      parsed.gt(1000) ||
      parsed.decimalPlaces() > 4
    )
      throw new BadRequestException({
        code: MarkupErrorCode.MARKUP_INVALID_PERCENTAGE,
        message: 'El markup debe estar entre 0 y 1000 con hasta 4 decimales.',
      });
    return parsed.toFixed(4);
  }

  private async validateTarget(
    manager: EntityManager,
    level: MarkupLevel,
    categoryId?: string | null,
    productId?: string | null,
  ): Promise<void> {
    if (
      (level === MarkupLevel.GLOBAL && (categoryId || productId)) ||
      (level === MarkupLevel.CATEGORY && (!categoryId || productId)) ||
      (level === MarkupLevel.PRODUCT && (!productId || categoryId))
    )
      throw new BadRequestException({
        code: MarkupErrorCode.MARKUP_INVALID_TARGET,
        message:
          'El nivel y el objetivo de la configuración son incompatibles.',
      });
    if (
      level === MarkupLevel.CATEGORY &&
      !(await manager.findOneBy(Category, { id: categoryId! }))
    )
      this.throwTargetNotFound('La categoría indicada no existe.');
    if (level === MarkupLevel.PRODUCT) {
      const product = await manager.findOneBy(Product, { id: productId! });
      if (!product) this.throwTargetNotFound('El producto indicado no existe.');
      if (product.status !== ProductStatus.ACTIVE)
        throw new ConflictException({
          code: MarkupErrorCode.MARKUP_TARGET_INACTIVE,
          message: 'No se puede configurar un producto inactivo.',
        });
    }
  }

  private throwTargetNotFound(message: string): never {
    throw new NotFoundException({
      code: MarkupErrorCode.MARKUP_INVALID_TARGET,
      message,
    });
  }

  private async lockTarget(
    manager: EntityManager,
    level: MarkupLevel,
    categoryId?: string | null,
    productId?: string | null,
  ): Promise<void> {
    await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
      `markup:${level}:${categoryId ?? productId ?? 'global'}`,
    ]);
  }

  private async load(
    manager: EntityManager,
    id: string,
    lock = false,
  ): Promise<MarkupConfiguration> {
    const qb = manager
      .createQueryBuilder(MarkupConfiguration, 'markup')
      .leftJoinAndSelect('markup.category', 'category')
      .leftJoinAndSelect('markup.product', 'product')
      .where('markup.id = :id', { id });
    if (lock) qb.setLock('pessimistic_write', undefined, ['markup']);
    const entity = await qb.getOne();
    if (!entity)
      throw new NotFoundException({
        code: MarkupErrorCode.MARKUP_NOT_FOUND,
        message: 'La configuración de markup no existe.',
      });
    return entity;
  }

  private async recalculateAffected(
    manager: EntityManager,
    configuration: MarkupConfiguration,
  ): Promise<void> {
    const qb = manager.createQueryBuilder(Product, 'product');
    if (configuration.level === MarkupLevel.CATEGORY)
      qb.where('product.categoryId = :categoryId', {
        categoryId: configuration.categoryId,
      });
    if (configuration.level === MarkupLevel.PRODUCT)
      qb.where('product.id = :productId', {
        productId: configuration.productId,
      });
    for (const product of await qb.getMany()) {
      const effective = await this.engine.resolveForProduct(product, manager);
      const suggested = this.engine.calculateSuggestedPrice(
        product.costNet,
        effective.percentage,
      );
      if (new Decimal(product.suggestedPriceNet).toFixed(2) !== suggested) {
        product.suggestedPriceNet = suggested;
        await manager.save(Product, product);
      }
    }
  }

  private map(entity: MarkupConfiguration): IMarkupConfiguration {
    return {
      id: entity.id,
      level: entity.level,
      percentage: new Decimal(entity.percentage).toFixed(4),
      categoryId: entity.categoryId,
      categoryName: entity.category?.name ?? null,
      productId: entity.productId,
      productCode: entity.product?.internalCode ?? null,
      productName: entity.product?.name ?? null,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  private translateUnique(error: unknown): void {
    const driverError =
      error instanceof QueryFailedError
        ? (error as QueryFailedError & { driverError?: { code?: string } })
            .driverError
        : undefined;
    if (driverError?.code === '23505')
      throw new ConflictException({
        code: MarkupErrorCode.MARKUP_ALREADY_EXISTS,
        message: 'Ya existe una configuración para ese nivel u objetivo.',
      });
  }
}
