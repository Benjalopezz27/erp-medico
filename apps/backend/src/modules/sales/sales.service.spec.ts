import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  ArcaStatus,
  CustomerPricingRuleApplied,
  PaymentMethod,
  SaleStatus,
  SalesErrorCode,
} from '@erp/shared-types';
import { AuditService } from '../audit/audit.service';
import { CustomerPricingService } from '../customers/special-prices/services/customer-pricing.service';
import { AccountReceivable } from '../receivables/entities/account-receivable.entity';
import { ReceivablesService } from '../receivables/receivables.service';
import { StockService } from '../stock/stock.service';
import { FiscalDocument } from './entities/fiscal-document.entity';
import { SaleItem } from './entities/sale-item.entity';
import { Sale } from './entities/sale.entity';
import { SalesService } from './sales.service';

describe('SalesService', () => {
  const userId = '10000000-0000-4000-8000-000000000001';
  const productId = '20000000-0000-4000-8000-000000000001';
  const baseDto = {
    customerId: null,
    isCreditSale: false,
    requiresFiscalInvoice: false,
    paymentMethod: PaymentMethod.EFECTIVO,
    items: [{ productId, quantityBase: 1 }],
  };

  let sale: any;
  let items: any[];
  let fiscalDocument: any;
  let debt: any;
  let manager: any;
  let dataSource: any;
  let customerPricingService: jest.Mocked<
    Pick<CustomerPricingService, 'resolveForSale'>
  >;
  let stockService: jest.Mocked<Pick<StockService, 'recordMovement'>>;
  let receivablesService: jest.Mocked<
    Pick<ReceivablesService, 'recordCreditSaleDebt'>
  >;
  let auditService: jest.Mocked<Pick<AuditService, 'record'>>;
  let service: SalesService;

  beforeEach(() => {
    sale = null;
    items = [];
    fiscalDocument = null;
    debt = null;
    const detailQuery = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn(async () =>
        sale
          ? {
              ...sale,
              customer: null,
              user: { id: userId, name: 'Vendedor' },
              items: items.map((item) => ({
                ...item,
                product: {
                  id: productId,
                  internalCode: 'P0001',
                  name: 'Producto',
                },
              })),
              fiscalDocument,
            }
          : null,
      ),
    };
    const saleRepository = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => {
        sale = {
          id: 'sale-1',
          createdAt: new Date('2026-08-31T12:00:00Z'),
          updatedAt: new Date('2026-08-31T12:00:00Z'),
          ...value,
        };
        return sale;
      }),
      createQueryBuilder: jest.fn(() => detailQuery),
    };
    const itemRepository = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => {
        const saved = { id: `item-${items.length + 1}`, ...value };
        items.push(saved);
        return saved;
      }),
    };
    const fiscalRepository = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => {
        fiscalDocument = { id: 'fiscal-1', ...value };
        return fiscalDocument;
      }),
    };
    const debtRepository = { findOne: jest.fn(async () => debt) };
    manager = {
      queryRunner: { isTransactionActive: true },
      query: jest.fn().mockResolvedValue([{ saleNumber: 'V-00000001' }]),
      getRepository: jest.fn((entity) => {
        if (entity === Sale) return saleRepository;
        if (entity === SaleItem) return itemRepository;
        if (entity === FiscalDocument) return fiscalRepository;
        if (entity === AccountReceivable) return debtRepository;
        throw new Error('Unexpected repository');
      }),
    };
    dataSource = {
      manager,
      getRepository: jest.fn(() => saleRepository),
      transaction: jest.fn(async (callback) => callback(manager)),
    };
    customerPricingService = {
      resolveForSale: jest.fn().mockResolvedValue({
        productId,
        productCode: 'P0001',
        productName: 'Producto',
        catalogPriceNet: '10.00',
        ruleApplied: CustomerPricingRuleApplied.CATALOG_PRICE,
        ruleId: null,
        discountPercentage: null,
        discountAmountNet: '0.00',
        finalPriceNet: '10.00',
        ivaPercentage: '21.00',
      }),
    };
    stockService = { recordMovement: jest.fn().mockResolvedValue({} as any) };
    receivablesService = {
      recordCreditSaleDebt: jest.fn(async (_manager, input) => {
        debt = {
          id: 'debt-1',
          ...input,
          documentReference: input.saleNumber,
          originalAmount: input.totalGross,
          currentBalance: input.totalGross,
          status: 'PENDIENTE',
          dueDate: null,
        };
        return debt;
      }),
    };
    auditService = { record: jest.fn().mockResolvedValue({} as any) };
    service = new SalesService(
      dataSource,
      customerPricingService as any,
      stockService as any,
      receivablesService as any,
      auditService as any,
    );
  });

  it('confirms an anonymous cash sale using backend pricing and IVA', async () => {
    const result = await service.create(baseDto, userId);

    expect(result).toMatchObject({
      saleNumber: 'V-00000001',
      status: SaleStatus.CONFIRMADA,
      totalNet: '10.00',
      ivaTotal: '2.10',
      totalGross: '12.10',
      fiscalDocument: null,
      accountReceivable: null,
    });
    expect(customerPricingService.resolveForSale).toHaveBeenCalledWith(
      null,
      productId,
      manager,
    );
    expect(stockService.recordMovement).toHaveBeenCalledWith(
      expect.objectContaining({ documentReference: 'V-00000001' }),
      manager,
    );
    expect(auditService.record).toHaveBeenCalledTimes(1);
  });

  it('creates a pending fiscal document and debt for a credit sale', async () => {
    const result = await service.create(
      {
        ...baseDto,
        customerId: '30000000-0000-4000-8000-000000000001',
        isCreditSale: true,
        requiresFiscalInvoice: true,
        paymentMethod: PaymentMethod.CTA_CTE,
      },
      userId,
    );

    expect(result.fiscalDocument).toMatchObject({
      documentType: null,
      pointOfSale: null,
      documentNumber: null,
      arcaStatus: ArcaStatus.PENDIENTE_FACTURACION,
    });
    expect(result.accountReceivable).toMatchObject({
      originalAmount: '12.10',
      currentBalance: '12.10',
    });
  });

  it.each([
    [
      { ...baseDto, isCreditSale: true },
      SalesErrorCode.SALE_CREDIT_REQUIRES_CUSTOMER,
    ],
    [
      {
        ...baseDto,
        customerId: '30000000-0000-4000-8000-000000000001',
        isCreditSale: true,
      },
      SalesErrorCode.SALE_CREDIT_REQUIRES_INVOICE,
    ],
    [
      { ...baseDto, paymentMethod: PaymentMethod.CTA_CTE },
      SalesErrorCode.SALE_CASH_INVALID_CURRENT_ACCOUNT,
    ],
  ])(
    'rejects an invalid commercial contract before the transaction',
    async (dto, code) => {
      await expect(service.create(dto as any, userId)).rejects.toMatchObject({
        response: expect.objectContaining({ code }),
      });
      expect(dataSource.transaction).not.toHaveBeenCalled();
    },
  );

  it('rejects duplicate products before the transaction', async () => {
    await expect(
      service.create(
        { ...baseDto, items: [...baseDto.items, ...baseDto.items] },
        userId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rejects client supplied prices before the transaction', async () => {
    await expect(
      service.create(
        {
          ...baseDto,
          items: [{ ...baseDto.items[0], unitPriceNet: '0.01' }],
        } as any,
        userId,
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: SalesErrorCode.SALE_PRICE_FIELDS_NOT_ALLOWED,
      }),
    });
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('translates a deadlock without retrying the transaction', async () => {
    dataSource.transaction.mockRejectedValueOnce({ code: '40P01' });
    await expect(service.create(baseDto, userId)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
  });
});
