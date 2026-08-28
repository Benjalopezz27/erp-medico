import { InternalServerErrorException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import Decimal from 'decimal.js';
import { MarkupLevel } from '@erp/shared-types';
import { MarkupEngineService } from './markup-engine.service';

describe('MarkupEngineService', () => {
  const product = {
    id: 'product-1',
    internalCode: 'P0001',
    name: 'Jeringa',
    categoryId: 'category-1',
    costNet: '100.0000',
  } as any;
  const rules = [
    {
      id: 'global',
      level: MarkupLevel.GLOBAL,
      percentage: '15.0000',
      categoryId: null,
      productId: null,
    },
    {
      id: 'category',
      level: MarkupLevel.CATEGORY,
      percentage: '20.0000',
      categoryId: 'category-1',
      productId: null,
      category: { name: 'Insumos' },
    },
    {
      id: 'product',
      level: MarkupLevel.PRODUCT,
      percentage: '25.0000',
      categoryId: null,
      productId: 'product-1',
      product: { name: 'Jeringa' },
    },
  ];
  const qb = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };
  const manager = { createQueryBuilder: jest.fn(() => qb) } as any;
  const service = new MarkupEngineService({ manager } as DataSource);

  beforeEach(() => jest.clearAllMocks());

  it.each([
    [rules, MarkupLevel.PRODUCT, '25.0000'],
    [rules.slice(0, 2), MarkupLevel.CATEGORY, '20.0000'],
    [rules.slice(0, 1), MarkupLevel.GLOBAL, '15.0000'],
  ])(
    'resolves deterministic hierarchy',
    async (available, level, percentage) => {
      qb.getMany.mockResolvedValue(available);
      await expect(
        service.resolveForProduct(product, manager),
      ).resolves.toMatchObject({ level, percentage });
    },
  );

  it('fails with a stable configuration error when global fallback is missing', async () => {
    qb.getMany.mockResolvedValue([]);
    await expect(
      service.resolveForProduct(product, manager),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('calculates with Decimal and ROUND_HALF_UP only at the end', () => {
    expect(service.calculateSuggestedPrice('10.0050', '0')).toBe('10.01');
    expect(service.calculateSuggestedPrice('100.0000', '25.0000')).toBe(
      '125.00',
    );
    expect(
      new Decimal(service.calculateSuggestedPrice('0', '1000')).isZero(),
    ).toBe(true);
  });
});
