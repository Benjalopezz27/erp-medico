import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import {
  PurchaseOrderStatus,
  StockMovementType,
  AuditAction,
} from '@erp/shared-types';

import { GoodsReceiptsService } from './goods-receipts.service';
import { GoodsReceipt } from '../entities/goods-receipt.entity';
import { PurchaseOrder } from '../entities/purchase-order.entity';
import { PurchaseOrderItem } from '../entities/purchase-order-item.entity';
import { StockService } from '../../stock/stock.service';
import { AuditService } from '../../audit/audit.service';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { User } from '../../users/entities/user.entity';

describe('GoodsReceiptsService', () => {
  let service: GoodsReceiptsService;
  let dataSource: DataSource;
  let stockService: jest.Mocked<StockService>;
  let auditService: jest.Mocked<AuditService>;
  let purchaseOrderRepository: jest.Mocked<Repository<PurchaseOrder>>;
  let goodsReceiptRepository: jest.Mocked<Repository<GoodsReceipt>>;

  const mockUser = {
    id: 'user-uuid-1',
    name: 'Admin User',
    email: 'admin@erp.com',
  };

  const mockSupplier = {
    id: 'supplier-uuid-1',
    businessName: 'Droguería Central',
    cuit: '30123456789',
  };

  const mockPoItem: Partial<PurchaseOrderItem> = {
    id: 'poi-uuid-1',
    purchaseOrderId: 'po-uuid-1',
    productId: 'prod-uuid-1',
    purchaseUnitId: 'unit-uuid-1',
    supplierSkuSnapshot: 'SKU-001',
    productCodeSnapshot: 'MED-001',
    productNameSnapshot: 'Jeringa 5ml',
    purchaseUnitNameSnapshot: 'Caja x 100',
    purchaseUnitSymbolSnapshot: 'CJA',
    conversionFactorSnapshot: '100.0000',
    orderedQty: '10.0000',
    receivedQty: '0.0000',
    expectedCostUnitNet: '1500.0000',
    subtotalNet: '15000.0000',
  };

  const mockPurchaseOrder: Partial<PurchaseOrder> = {
    id: 'po-uuid-1',
    orderNumber: 'OC-000001',
    supplierId: 'supplier-uuid-1',
    status: PurchaseOrderStatus.EMITIDA,
    totalNet: '15000.0000',
    userId: 'user-uuid-1',
    supplier: mockSupplier as any,
    user: mockUser as any,
    items: [mockPoItem as PurchaseOrderItem],
  };

  let mockTxManager: any;

  beforeEach(async () => {
    mockTxManager = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(async (entity) => {
        if (entity === Supplier) return mockSupplier;
        if (entity === User) return mockUser;
        return null;
      }),
      create: jest.fn((entity, data) => ({ ...data, id: 'created-id-1' })),
      save: jest.fn(async (entity, data) => ({
        ...data,
        id: data.id || 'saved-id-1',
        receiptNumber: data.receiptNumber || 'REC-000001',
        createdAt: new Date(),
      })),
    };

    stockService = {
      recordMovement: jest.fn().mockResolvedValue({
        id: 'mov-uuid-1',
        productId: 'prod-uuid-1',
        movementType: StockMovementType.ENTRADA_COMPRA,
        quantityBase: 1000,
        previousStock: 0,
        subsequentStock: 1000,
        reason: 'Recepción OC OC-000001',
        documentReference: '0001-00001234',
        userId: 'user-uuid-1',
        createdAt: new Date(),
      }),
    } as any;

    auditService = {
      record: jest.fn().mockResolvedValue({ id: 'audit-id-1' }),
    } as any;

    purchaseOrderRepository = {
      findOne: jest.fn(),
    } as any;

    goodsReceiptRepository = {
      findAndCount: jest.fn(),
    } as any;

    dataSource = {
      transaction: jest.fn((cb) => cb(mockTxManager)),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoodsReceiptsService,
        { provide: DataSource, useValue: dataSource },
        { provide: StockService, useValue: stockService },
        { provide: AuditService, useValue: auditService },
        {
          provide: getRepositoryToken(PurchaseOrder),
          useValue: purchaseOrderRepository,
        },
        {
          provide: getRepositoryToken(GoodsReceipt),
          useValue: goodsReceiptRepository,
        },
      ],
    }).compile();

    service = module.get<GoodsReceiptsService>(GoodsReceiptsService);
  });

  describe('createGoodsReceipt', () => {
    it('creates a full goods receipt, increases stock, updates PO to COMPLETADA, and logs audit', async () => {
      const qbPoMock = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ ...mockPurchaseOrder }),
      };

      const qbPoiMock = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ ...mockPoItem }]),
      };

      const qbPostedBaseMock = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ sum: '0' }),
      };

      mockTxManager.createQueryBuilder
        .mockReturnValueOnce(qbPoMock)
        .mockReturnValueOnce(qbPoiMock)
        .mockReturnValueOnce(qbPostedBaseMock);

      const res = await service.createGoodsReceipt(
        'po-uuid-1',
        {
          deliveryNoteNumber: ' 0001 - 00001234 ',
          items: [
            {
              purchaseOrderItemId: 'poi-uuid-1',
              receivedQtyPurchaseUnit: 10,
              provisionalCostUnitNet: 1500,
            },
          ],
        },
        'user-uuid-1',
      );

      expect(res.receipt.receiptNumber).toBe('REC-000001');
      expect(res.receipt.deliveryNoteNumber).toBe('0001 - 00001234');
      expect(res.receipt.items[0].receivedQtyBase).toBe('1000.00');
      expect(res.resultingPurchaseOrder.status).toBe(
        PurchaseOrderStatus.COMPLETADA,
      );

      expect(stockService.recordMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 'prod-uuid-1',
          movementType: StockMovementType.ENTRADA_COMPRA,
          quantityBase: 1000,
        }),
        mockTxManager,
      );

      expect(auditService.record).toHaveBeenCalledTimes(2);
      expect(auditService.record).toHaveBeenCalledWith(
        mockTxManager,
        expect.objectContaining({
          action: AuditAction.CREATE,
          entityName: 'GoodsReceipt',
        }),
      );
      expect(auditService.record).toHaveBeenCalledWith(
        mockTxManager,
        expect.objectContaining({
          action: AuditAction.UPDATE,
          entityName: 'PurchaseOrder',
        }),
      );
    });

    it('creates a partial goods receipt and updates PO status to PARCIAL', async () => {
      const qbPoMock = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ ...mockPurchaseOrder }),
      };

      const qbPoiMock = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ ...mockPoItem }]),
      };

      const qbPostedBaseMock = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ sum: '0' }),
      };

      mockTxManager.createQueryBuilder
        .mockReturnValueOnce(qbPoMock)
        .mockReturnValueOnce(qbPoiMock)
        .mockReturnValueOnce(qbPostedBaseMock);

      const res = await service.createGoodsReceipt(
        'po-uuid-1',
        {
          deliveryNoteNumber: '0001-00001234',
          items: [
            {
              purchaseOrderItemId: 'poi-uuid-1',
              receivedQtyPurchaseUnit: 4,
            },
          ],
        },
        'user-uuid-1',
      );

      expect(res.receipt.items[0].receivedQtyBase).toBe('400.00');
      expect(res.resultingPurchaseOrder.status).toBe(
        PurchaseOrderStatus.PARCIAL,
      );
      expect(res.resultingPurchaseOrder.items[0].receivedQty).toBe('4.0000');
      expect(res.resultingPurchaseOrder.items[0].pendingQty).toBe('6.0000');
    });

    it('throws NotFoundException when purchase order does not exist', async () => {
      const qbPoMock = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };

      mockTxManager.createQueryBuilder.mockReturnValueOnce(qbPoMock);

      await expect(
        service.createGoodsReceipt(
          'non-existent-po',
          {
            deliveryNoteNumber: '0001-00001234',
            items: [
              { purchaseOrderItemId: 'poi-uuid-1', receivedQtyPurchaseUnit: 1 },
            ],
          },
          'user-uuid-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when purchase order is in BORRADOR, COMPLETADA or CANCELADA', async () => {
      const qbPoMock = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          ...mockPurchaseOrder,
          status: PurchaseOrderStatus.BORRADOR,
        }),
      };

      mockTxManager.createQueryBuilder.mockReturnValueOnce(qbPoMock);

      await expect(
        service.createGoodsReceipt(
          'po-uuid-1',
          {
            deliveryNoteNumber: '0001-00001234',
            items: [
              { purchaseOrderItemId: 'poi-uuid-1', receivedQtyPurchaseUnit: 1 },
            ],
          },
          'user-uuid-1',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException on duplicate delivery note for same supplier', async () => {
      const qbPoMock = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ ...mockPurchaseOrder }),
      };

      mockTxManager.createQueryBuilder.mockReturnValueOnce(qbPoMock);
      mockTxManager.findOne.mockResolvedValueOnce({ id: 'existing-gr-id' });

      await expect(
        service.createGoodsReceipt(
          'po-uuid-1',
          {
            deliveryNoteNumber: '0001-00001234',
            items: [
              { purchaseOrderItemId: 'poi-uuid-1', receivedQtyPurchaseUnit: 1 },
            ],
          },
          'user-uuid-1',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException when item does not belong to PO (GOODS_RECEIPT_ITEM_MISMATCH)', async () => {
      const qbPoMock = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ ...mockPurchaseOrder }),
      };

      const qbPoiMock = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ ...mockPoItem }]),
      };

      mockTxManager.createQueryBuilder
        .mockReturnValueOnce(qbPoMock)
        .mockReturnValueOnce(qbPoiMock);

      await expect(
        service.createGoodsReceipt(
          'po-uuid-1',
          {
            deliveryNoteNumber: '0001-00001234',
            items: [
              {
                purchaseOrderItemId: 'foreign-poi-uuid',
                receivedQtyPurchaseUnit: 1,
              },
            ],
          },
          'user-uuid-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when duplicate purchaseOrderItemId is in payload', async () => {
      await expect(
        service.createGoodsReceipt(
          'po-uuid-1',
          {
            deliveryNoteNumber: '0001-00001234',
            items: [
              { purchaseOrderItemId: 'poi-uuid-1', receivedQtyPurchaseUnit: 1 },
              { purchaseOrderItemId: 'poi-uuid-1', receivedQtyPurchaseUnit: 2 },
            ],
          },
          'user-uuid-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('maps PostgreSQL deadlock error code 40P01 to HTTP 409 Conflict', async () => {
      (dataSource.transaction as jest.Mock).mockRejectedValueOnce({
        code: '40P01',
        message: 'deadlock detected',
      });

      await expect(
        service.createGoodsReceipt(
          'po-uuid-1',
          {
            deliveryNoteNumber: '0001-00001234',
            items: [
              { purchaseOrderItemId: 'poi-uuid-1', receivedQtyPurchaseUnit: 1 },
            ],
          },
          'user-uuid-1',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findGoodsReceiptsByPurchaseOrder', () => {
    it('returns paginated receipts for an existing purchase order', async () => {
      purchaseOrderRepository.findOne.mockResolvedValueOnce(
        mockPurchaseOrder as PurchaseOrder,
      );

      goodsReceiptRepository.findAndCount.mockResolvedValueOnce([
        [
          {
            id: 'gr-uuid-1',
            receiptNumber: 'REC-000001',
            purchaseOrderId: 'po-uuid-1',
            supplierId: 'supplier-uuid-1',
            deliveryNoteNumber: '0001-00001234',
            userId: 'user-uuid-1',
            createdAt: new Date(),
            purchaseOrder: mockPurchaseOrder as any,
            supplier: mockSupplier as any,
            user: mockUser as any,
            items: [],
          } as GoodsReceipt,
        ],
        1,
      ]);

      const res = await service.findGoodsReceiptsByPurchaseOrder('po-uuid-1', {
        page: 1,
        limit: 20,
      });

      expect(res.data).toHaveLength(1);
      expect(res.meta.total).toBe(1);
      expect(res.data[0].receiptNumber).toBe('REC-000001');
    });

    it('throws NotFoundException when purchase order does not exist', async () => {
      purchaseOrderRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        service.findGoodsReceiptsByPurchaseOrder('non-existent-po', {
          page: 1,
          limit: 20,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
