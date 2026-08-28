import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import Decimal from 'decimal.js';
import {
  IEffectiveMarkup,
  MarkupErrorCode,
  MarkupLevel,
} from '@erp/shared-types';
import { Product } from '../../products/entities/product.entity';
import { MarkupConfiguration } from '../entities/markup-configuration.entity';

@Injectable()
export class MarkupEngineService {
  constructor(private readonly dataSource: DataSource) {}

  calculateSuggestedPrice(
    costNet: string | number,
    percentage: string | number,
  ): string {
    return new Decimal(costNet)
      .times(new Decimal(1).plus(new Decimal(percentage).dividedBy(100)))
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
      .toFixed(2);
  }

  async resolveEffectiveMarkup(
    productId: string,
    manager: EntityManager = this.dataSource.manager,
  ): Promise<IEffectiveMarkup> {
    const product = await manager.findOne(Product, {
      where: { id: productId },
      relations: { category: true },
    });
    if (!product) {
      throw new NotFoundException({
        code: MarkupErrorCode.MARKUP_INVALID_TARGET,
        message: 'El producto indicado no existe.',
      });
    }
    return this.resolveForProduct(product, manager);
  }

  async resolveForProduct(
    product: Product,
    manager: EntityManager,
  ): Promise<IEffectiveMarkup> {
    const rules = await manager
      .createQueryBuilder(MarkupConfiguration, 'markup')
      .leftJoinAndSelect('markup.category', 'category')
      .leftJoinAndSelect('markup.product', 'targetProduct')
      .where(
        '(markup.level = :productLevel AND markup.productId = :productId) OR ' +
          '(markup.level = :categoryLevel AND markup.categoryId = :categoryId) OR ' +
          'markup.level = :globalLevel',
        {
          productLevel: MarkupLevel.PRODUCT,
          productId: product.id,
          categoryLevel: MarkupLevel.CATEGORY,
          categoryId: product.categoryId,
          globalLevel: MarkupLevel.GLOBAL,
        },
      )
      .getMany();

    const selected =
      rules.find((rule) => rule.level === MarkupLevel.PRODUCT) ??
      rules.find((rule) => rule.level === MarkupLevel.CATEGORY) ??
      rules.find((rule) => rule.level === MarkupLevel.GLOBAL);
    if (!selected) {
      throw new InternalServerErrorException({
        code: MarkupErrorCode.MARKUP_GLOBAL_MISSING,
        message: 'No existe una configuración global de markup.',
      });
    }
    return {
      configurationId: selected.id,
      level: selected.level,
      percentage: new Decimal(selected.percentage).toFixed(4),
      targetId: selected.productId ?? selected.categoryId,
      targetName:
        selected.product?.name ??
        selected.category?.name ??
        'Configuración global',
    };
  }
}
