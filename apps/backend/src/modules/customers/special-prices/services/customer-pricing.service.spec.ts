import {
  CustomerPricingRuleApplied,
  CustomerSpecialPriceMode,
  ProductStatus,
} from '@erp/shared-types';
import { Customer } from '../../entities/customer.entity';
import { CustomerSpecialPrice } from '../entities/customer-special-price.entity';
import { CustomerPricingService } from './customer-pricing.service';
import { Product } from '../../../products/entities/product.entity';

describe('CustomerPricingService', () => {
  const customer = {
    id: '10000000-0000-4000-8000-000000000001',
    businessName: 'Cliente precios',
    isActive: true,
    generalDiscountPercentage: '15.0000',
  } as Customer;
  const product = {
    id: '20000000-0000-4000-8000-000000000001',
    internalCode: 'P-001',
    name: 'Producto precios',
    activePriceNet: '120.00',
    suggestedPriceNet: '999.00',
    status: ProductStatus.ACTIVE,
  } as Product;
  const queryBuilder = (value: unknown) => ({
    where: jest.fn().mockReturnThis(),
    setLock: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(value),
  });
  const manager = {
    createQueryBuilder: jest.fn((entity) =>
      queryBuilder(entity === Customer ? customer : product),
    ),
    findOne: jest.fn(),
  };
  const dataSource = {
    transaction: jest.fn((callback) => callback(manager)),
    manager,
  };
  const auditService = { record: jest.fn() };
  const service = new CustomerPricingService(
    dataSource as any,
    auditService as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    manager.findOne.mockResolvedValue(null);
  });

  it.each([
    {
      name: 'fixed price over every discount',
      rule: {
        id: '30000000-0000-4000-8000-000000000001',
        specialPriceNet: '100.00',
        discountPercentage: null,
      },
      applied: CustomerPricingRuleApplied.FIXED_PRICE,
      expected: '100.00',
    },
    {
      name: 'product discount over the customer discount',
      rule: {
        id: '30000000-0000-4000-8000-000000000001',
        specialPriceNet: null,
        discountPercentage: '10.0000',
      },
      applied: CustomerPricingRuleApplied.PRODUCT_DISCOUNT,
      expected: '108.00',
    },
    {
      name: 'a free fixed price at the lower boundary',
      rule: {
        id: '30000000-0000-4000-8000-000000000001',
        specialPriceNet: '0.00',
        discountPercentage: null,
      },
      applied: CustomerPricingRuleApplied.FIXED_PRICE,
      expected: '0.00',
    },
    {
      name: 'a one hundred percent product discount',
      rule: {
        id: '30000000-0000-4000-8000-000000000001',
        specialPriceNet: null,
        discountPercentage: '100.0000',
      },
      applied: CustomerPricingRuleApplied.PRODUCT_DISCOUNT,
      expected: '0.00',
    },
    {
      name: 'general customer discount without a product rule',
      rule: null,
      applied: CustomerPricingRuleApplied.GENERAL_DISCOUNT,
      expected: '102.00',
    },
  ])('resolves $name without reading suggested price', async (testCase) => {
    manager.findOne.mockResolvedValue(
      testCase.rule as CustomerSpecialPrice | null,
    );
    const result = await service.getFinalPrice(
      customer.id,
      product.id,
      manager as any,
    );
    expect(result).toMatchObject({
      basePriceNet: '120.00',
      ruleApplied: testCase.applied,
      finalPriceNet: testCase.expected,
    });
    expect(product.activePriceNet).toBe('120.00');
    expect(product.suggestedPriceNet).toBe('999.00');
  });

  it('falls back to catalog and rounds a percentage only at the final price', async () => {
    const withoutDiscount = {
      ...customer,
      generalDiscountPercentage: '0.0000',
    } as Customer;
    manager.createQueryBuilder.mockImplementation((entity) =>
      queryBuilder(entity === Customer ? withoutDiscount : product),
    );
    const catalog = await service.getFinalPrice(
      customer.id,
      product.id,
      manager as any,
    );
    expect(catalog).toMatchObject({
      ruleApplied: CustomerPricingRuleApplied.CATALOG_PRICE,
      finalPriceNet: '120.00',
    });

    manager.createQueryBuilder.mockImplementation((entity) =>
      queryBuilder(
        entity === Customer
          ? { ...customer, generalDiscountPercentage: '33.3333' }
          : { ...product, activePriceNet: '10.00' },
      ),
    );
    const discounted = await service.getFinalPrice(
      customer.id,
      product.id,
      manager as any,
    );
    expect(discounted).toMatchObject({
      discountPercentage: '33.3333',
      discountAmountNet: '3.33',
      finalPriceNet: '6.67',
    });
  });

  it('rejects an ambiguous create mode before persistence', async () => {
    const actor = { id: '40000000-0000-4000-8000-000000000001' } as any;
    const repository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      save: jest.fn(),
    };
    (manager as any).getRepository = jest.fn(() => repository);
    await expect(
      service.createSpecialPrice(
        customer.id,
        {
          productId: product.id,
          mode: CustomerSpecialPriceMode.FIXED_PRICE,
          specialPriceNet: '100.00',
          discountPercentage: '5.0000',
        },
        actor,
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'CUSTOMER_SPECIAL_PRICE_INVALID_MODE',
      }),
    });
    expect(repository.save).not.toHaveBeenCalled();
  });
});
