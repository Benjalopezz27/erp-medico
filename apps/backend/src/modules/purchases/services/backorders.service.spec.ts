import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PurchaseOrderStatus } from '@erp/shared-types';
import { BackordersService } from './backorders.service';
import { PurchaseOrder } from '../entities/purchase-order.entity';
import { PurchaseOrderItem } from '../entities/purchase-order-item.entity';

describe('BackordersService', () => {
  let service: BackordersService;
  let repository: jest.Mocked<Repository<PurchaseOrder>>;
  let queryBuilder: Record<string, jest.Mock>;

  const supplierA = {
    id: '11111111-1111-4111-8111-111111111111',
    businessName: 'Droguería Alfa',
    cuit: '30111111118',
  };
  const supplierB = {
    id: '22222222-2222-4222-8222-222222222222',
    businessName: 'Botiquín Beta',
    cuit: '30222222226',
  };

  const item = (
    id: string,
    productId: string,
    itemIndex: number,
    orderedQty: string,
    receivedQty: string,
  ) =>
    ({
      id,
      productId,
      itemIndex,
      productCodeSnapshot: `P-${id}`,
      productNameSnapshot: `Producto ${id}`,
      supplierSkuSnapshot: `SKU-${id}`,
      purchaseUnitNameSnapshot: 'Caja',
      purchaseUnitSymbolSnapshot: 'cja',
      orderedQty,
      receivedQty,
    }) as PurchaseOrderItem;

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-27T15:00:00.000Z'));
    queryBuilder = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };
    repository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    } as unknown as jest.Mocked<Repository<PurchaseOrder>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackordersService,
        { provide: getRepositoryToken(PurchaseOrder), useValue: repository },
      ],
    }).compile();
    service = module.get(BackordersService);
  });

  afterEach(() => jest.useRealTimers());

  it('groups pending lines, derives decimal balances, and calculates exact counts', async () => {
    queryBuilder.getMany.mockResolvedValue([
      {
        id: 'po-a-new',
        orderNumber: 'OC-000002',
        supplierId: supplierA.id,
        supplier: supplierA,
        status: PurchaseOrderStatus.PARCIAL,
        emittedAt: new Date('2026-08-20T13:00:00.000Z'),
        expectedDeliveryDate: null,
        items: [
          item('a2', 'product-shared', 2, '10.0000', '4.2500'),
          item('complete', 'product-complete', 1, '2.0000', '2.0000'),
        ],
      },
      {
        id: 'po-a-old',
        orderNumber: 'OC-000001',
        supplierId: supplierA.id,
        supplier: supplierA,
        status: PurchaseOrderStatus.EMITIDA,
        emittedAt: new Date('2026-08-12T13:00:00.000Z'),
        expectedDeliveryDate: '2026-08-18',
        items: [item('a1', 'product-shared', 1, '5.0000', '0.0000')],
      },
      {
        id: 'po-b',
        orderNumber: 'OC-000003',
        supplierId: supplierB.id,
        supplier: supplierB,
        status: PurchaseOrderStatus.EMITIDA,
        emittedAt: new Date('2026-08-13T13:00:00.000Z'),
        expectedDeliveryDate: null,
        items: [item('b1', 'product-b', 1, '1.0000', '0.0000')],
      },
    ]);

    const result = await service.findPending({});

    expect(result.summary).toEqual({
      supplierCount: 2,
      orderCount: 3,
      pendingProductCount: 2,
      pendingLineCount: 3,
      urgentOrderCount: 1,
    });
    expect(result.groups.map((group) => group.supplier.businessName)).toEqual([
      'Botiquín Beta',
      'Droguería Alfa',
    ]);
    const alfa = result.groups[1];
    expect(alfa.orders.map((order) => order.orderNumber)).toEqual([
      'OC-000001',
      'OC-000002',
    ]);
    expect(alfa.orders[1].items[0].pendingQty).toBe('5.7500');
    expect(alfa.pendingProductCount).toBe(1);
  });

  it('keeps only urgent orders when urgentOnly is true', async () => {
    queryBuilder.getMany.mockResolvedValue([
      {
        id: 'urgent',
        orderNumber: 'OC-000001',
        supplierId: supplierA.id,
        supplier: supplierA,
        status: PurchaseOrderStatus.EMITIDA,
        emittedAt: new Date('2026-08-12T13:00:00.000Z'),
        items: [item('a1', 'product-a', 1, '1', '0')],
      },
      {
        id: 'day-14',
        orderNumber: 'OC-000002',
        supplierId: supplierB.id,
        supplier: supplierB,
        status: PurchaseOrderStatus.EMITIDA,
        emittedAt: new Date('2026-08-13T13:00:00.000Z'),
        items: [item('b1', 'product-b', 1, '1', '0')],
      },
    ]);

    const result = await service.findPending({ urgentOnly: true });

    expect(result.summary.orderCount).toBe(1);
    expect(result.groups[0].orders[0].id).toBe('urgent');
  });

  it('filters by supplier and uses EXISTS so product search does not trim returned lines', async () => {
    queryBuilder.getMany.mockResolvedValue([]);

    await service.findPending({
      supplierId: supplierA.id,
      search: '  Gasa_10%  ',
    });

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'po.supplierId = :supplierId',
      { supplierId: supplierA.id },
    );
    const searchCall = queryBuilder.andWhere.mock.calls.find(([condition]) =>
      String(condition).includes('EXISTS'),
    );
    expect(searchCall).toBeDefined();
    expect(searchCall?.[0]).toContain('search_item.purchase_order_id = po.id');
    expect(searchCall?.[1]).toEqual({
      search: '%gasa\\_10\\%%',
      cuitSearch: '%10%',
    });
  });
});
