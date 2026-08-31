import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  ArcaStatus,
  AuditAction,
  FiscalDocumentType,
  ProductTaxTreatment,
  SaleReturnItemQuality,
  SaleStatus,
  StockMovementType,
} from '@erp/shared-types';
import { Sale } from '../../entities/sale.entity';
import { SaleItem } from '../../entities/sale-item.entity';
import { FiscalDocument } from '../../entities/fiscal-document.entity';
import { SaleReturn } from '../entities/sale-return.entity';
import { SaleReturnItem } from '../entities/sale-return-item.entity';
import { SaleReturnsService } from './sale-returns.service';

describe('SaleReturnsService', () => {
  const userId = '10000000-0000-4000-8000-000000000001';
  const saleId = '30000000-0000-4000-8000-000000000001';
  const productId1 = '20000000-0000-4000-8000-000000000001';
  const productId2 = '20000000-0000-4000-8000-000000000002';
  const saleItemId1 = '40000000-0000-4000-8000-000000000001';
  const saleItemId2 = '40000000-0000-4000-8000-000000000002';

  let sale: any;
  let saleItems: any[];
  let returns: any[];
  let returnItems: any[];
  let previousReturnedSums: Record<string, number>;
  let manager: any;
  let dataSource: any;
  let stockService: any;
  let quarantineService: any;
  let receivablesService: any;
  let auditService: any;
  let service: SaleReturnsService;

  beforeEach(() => {
    sale = {
      id: saleId,
      saleNumber: 'V-00000001',
      status: SaleStatus.CONFIRMADA,
      isCreditSale: false,
      requiresFiscalInvoice: true,
      fiscalDocuments: [
        {
          id: 'fiscal-inv-1',
          saleId,
          documentType: FiscalDocumentType.FACTURA_A,
          pointOfSale: 1,
          documentNumber: 100,
          arcaStatus: ArcaStatus.EMITIDO,
          saleReturnId: null,
        },
      ],
    };

    saleItems = [
      {
        id: saleItemId1,
        saleId,
        productId: productId1,
        quantityBase: '10.00',
        unitPriceNet: '100.00',
        taxTreatment: ProductTaxTreatment.GRAVADO,
        ivaPercentage: '21.00',
        product: { id: productId1, internalCode: 'PROD-1', name: 'Producto 1' },
      },
      {
        id: saleItemId2,
        saleId,
        productId: productId2,
        quantityBase: '5.00',
        unitPriceNet: '50.00',
        taxTreatment: ProductTaxTreatment.EXENTO,
        ivaPercentage: null,
        product: { id: productId2, internalCode: 'PROD-2', name: 'Producto 2' },
      },
    ];

    returns = [];
    returnItems = [];
    previousReturnedSums = {};

    const saleRepo = {
      createQueryBuilder: jest.fn(() => ({
        setLock: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn(async () => sale),
      })),
      findOne: jest.fn(async () => sale),
    };

    const saleItemRepo = {
      createQueryBuilder: jest.fn(() => ({
        setLock: jest.fn().mockReturnThis(),
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn((sql, params) => ({
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn(async () =>
            saleItems.filter((item) => params.ids.includes(item.id)),
          ),
        })),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn(async () => saleItems),
      })),
    };

    const saleReturnItemRepo = {
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn((sql, params) => ({
          getRawOne: jest.fn(async () => ({
            total: previousReturnedSums[params.saleItemId] || 0,
          })),
        })),
      })),
      create: jest.fn((val) => ({
        id: `return-item-${returnItems.length + 1}`,
        ...val,
      })),
      save: jest.fn(async (val) => {
        const idx = returnItems.findIndex((r) => r.id === val.id);
        if (idx >= 0) {
          returnItems[idx] = { ...returnItems[idx], ...val };
          return returnItems[idx];
        }
        const item = {
          id: val.id || `return-item-${returnItems.length + 1}`,
          ...val,
        };
        returnItems.push(item);
        return item;
      }),
    };

    const saleReturnRepo = {
      findOne: jest.fn(async () => null),
      create: jest.fn((val) => ({
        id: `return-${returns.length + 1}`,
        ...val,
      })),
      save: jest.fn(async (val) => {
        const idx = returns.findIndex((r) => r.id === val.id);
        if (idx >= 0) {
          returns[idx] = { ...returns[idx], ...val };
          return returns[idx];
        }
        const ret = {
          id: val.id || `return-${returns.length + 1}`,
          createdAt: new Date('2026-08-31T15:00:00Z'),
          ...val,
        };
        returns.push(ret);
        return ret;
      }),
      createQueryBuilder: jest.fn(() => ({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn(async () => {
          const ret = returns[returns.length - 1];
          return ret
            ? {
                ...ret,
                user: { id: userId, name: 'Vendedor' },
                fiscalDocument: {
                  id: 'fiscal-ret-1',
                  saleId,
                  documentType: FiscalDocumentType.NOTA_CREDITO_A,
                  pointOfSale: 1,
                  documentNumber: null,
                  arcaStatus: ArcaStatus.PENDIENTE_FACTURACION,
                },
                items: returnItems
                  .filter((ri) => ri.saleReturnId === ret.id)
                  .map((ri) => ({
                    ...ri,
                    product: {
                      id: ri.productId,
                      internalCode: 'P1',
                      name: 'Prod',
                    },
                  })),
              }
            : null;
        }),
        getMany: jest.fn(async () =>
          returns.map((ret) => ({
            ...ret,
            user: { id: userId, name: 'Vendedor' },
            items: returnItems
              .filter((ri) => ri.saleReturnId === ret.id)
              .map((ri) => ({
                ...ri,
                product: { id: ri.productId, internalCode: 'P1', name: 'Prod' },
              })),
          })),
        ),
      })),
    };

    const fiscalRepo = {
      find: jest.fn(async () => sale.fiscalDocuments || []),
      create: jest.fn((val) => ({ id: 'fiscal-nc-1', ...val })),
      save: jest.fn(async (val) => ({ id: 'fiscal-nc-1', ...val })),
    };

    manager = {
      getRepository: jest.fn((entity) => {
        if (entity === Sale) return saleRepo;
        if (entity === SaleItem) return saleItemRepo;
        if (entity === SaleReturn) return saleReturnRepo;
        if (entity === SaleReturnItem) return saleReturnItemRepo;
        if (entity === FiscalDocument) return fiscalRepo;
        return { create: jest.fn((v) => v), save: jest.fn(async (v) => v) };
      }),
    };

    dataSource = {
      transaction: jest.fn(async (cb) => cb(manager)),
      getRepository: jest.fn((entity) => manager.getRepository(entity)),
    };

    stockService = {
      recordMovement: jest.fn(
        async (dto) => ({ id: 'sm-ret-1', ...dto }) as any,
      ),
    };

    quarantineService = {
      recordQuarantineFromReturn: jest.fn(
        async (mgr, input) => ({ id: 'qs-ret-1', ...input }) as any,
      ),
    };

    receivablesService = {
      recordCreditNoteCompensation: jest.fn(async () => ({
        movement: { id: 'arm-1' } as any,
        accountReceivable: { id: 'ar-1' } as any,
      })),
    };

    auditService = {
      record: jest.fn(async () => undefined as any),
    };

    service = new SaleReturnsService(
      dataSource,
      saleReturnRepo as any,
      saleRepo as any,
      stockService as any,
      quarantineService as any,
      receivablesService as any,
      auditService as any,
    );
  });

  it('creates an APTO return: increments available stock and generates a Credit Note stub', async () => {
    const result = await service.createReturn(
      saleId,
      {
        reason: 'Devolución legítima',
        items: [
          {
            saleItemId: saleItemId1,
            quantityBase: 2,
            quality: SaleReturnItemQuality.APTO,
          },
        ],
      },
      userId,
    );

    expect(stockService.recordMovement).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: productId1,
        movementType: StockMovementType.DEVOLUCION_CLIENTE,
        quantityBase: 2,
        userId,
      }),
      manager,
    );
    expect(quarantineService.recordQuarantineFromReturn).not.toHaveBeenCalled();
    expect(auditService.record).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        action: AuditAction.CREATE,
        entityName: 'SaleReturn',
      }),
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0].quality).toBe(SaleReturnItemQuality.APTO);
  });

  it('creates a NO_APTO return: enters quarantine without calling stockService.recordMovement', async () => {
    const result = await service.createReturn(
      saleId,
      {
        reason: 'Mercadería dañada',
        items: [
          {
            saleItemId: saleItemId1,
            quantityBase: 3,
            quality: SaleReturnItemQuality.NO_APTO,
          },
        ],
      },
      userId,
    );

    expect(quarantineService.recordQuarantineFromReturn).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        productId: productId1,
        quantityBase: '3.00',
        actorId: userId,
      }),
    );
    expect(stockService.recordMovement).not.toHaveBeenCalled();
    expect(result.items[0].quality).toBe(SaleReturnItemQuality.NO_APTO);
  });

  it('creates a mixed return (APTO + NO_APTO) atomically', async () => {
    await service.createReturn(
      saleId,
      {
        reason: 'Devolución mixta',
        items: [
          {
            saleItemId: saleItemId1,
            quantityBase: 2,
            quality: SaleReturnItemQuality.APTO,
          },
          {
            saleItemId: saleItemId2,
            quantityBase: 1,
            quality: SaleReturnItemQuality.NO_APTO,
          },
        ],
      },
      userId,
    );

    expect(stockService.recordMovement).toHaveBeenCalledTimes(1);
    expect(quarantineService.recordQuarantineFromReturn).toHaveBeenCalledTimes(
      1,
    );
  });

  it('rejects return if quantity exceeds remaining returnable balance', async () => {
    previousReturnedSums[saleItemId1] = 8;

    await expect(
      service.createReturn(
        saleId,
        {
          reason: 'Exceso',
          items: [
            {
              saleItemId: saleItemId1,
              quantityBase: 3,
              quality: SaleReturnItemQuality.APTO,
            },
          ],
        },
        userId,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects duplicate saleItemId in the same request payload', async () => {
    await expect(
      service.createReturn(
        saleId,
        {
          reason: 'Duplicado',
          items: [
            {
              saleItemId: saleItemId1,
              quantityBase: 1,
              quality: SaleReturnItemQuality.APTO,
            },
            {
              saleItemId: saleItemId1,
              quantityBase: 1,
              quality: SaleReturnItemQuality.NO_APTO,
            },
          ],
        },
        userId,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects an unconfirmed sale (BORRADOR)', async () => {
    sale.status = SaleStatus.BORRADOR;

    await expect(
      service.createReturn(
        saleId,
        {
          reason: 'Venta borrador',
          items: [
            {
              saleItemId: saleItemId1,
              quantityBase: 1,
              quality: SaleReturnItemQuality.APTO,
            },
          ],
        },
        userId,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('compensates account receivable for credit sales', async () => {
    sale.isCreditSale = true;

    await service.createReturn(
      saleId,
      {
        reason: 'Devolución venta crédito',
        items: [
          {
            saleItemId: saleItemId1,
            quantityBase: 2,
            quality: SaleReturnItemQuality.APTO,
          },
        ],
      },
      userId,
    );

    expect(
      receivablesService.recordCreditNoteCompensation,
    ).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        saleId,
        creditNoteAmount: '242.00',
        userId,
      }),
    );
  });

  it('returns all returns for a given sale in findReturnsBySaleId', async () => {
    returns = [
      {
        id: 'ret-1',
        saleId,
        reason: 'Motivo 1',
        totalNet: '100.00',
        totalGross: '121.00',
        createdAt: new Date(),
      },
    ];
    const history = await service.findReturnsBySaleId(saleId);
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe('ret-1');
  });
});
