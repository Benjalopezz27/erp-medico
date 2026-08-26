import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  ProductStatus,
  PurchaseOrderStatus,
} from '@erp/shared-types';

import { PurchaseOrdersService } from './purchase-orders.service';
import { PurchaseOrder } from '../entities/purchase-order.entity';
import { PurchaseOrderItem } from '../entities/purchase-order-item.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { SupplierProduct } from '../../suppliers/supplier-products/entities/supplier-product.entity';
import { AuditService } from '../../audit/audit.service';

describe('PurchaseOrdersService Unit Tests', () => {
  let service: PurchaseOrdersService;
  let dataSource: jest.Mocked<DataSource>;
  let mockEntityManager: jest.Mocked<EntityManager>;
  let mockAuditService: jest.Mocked<AuditService>;

  let mockTxPoRepo: jest.Mocked<Repository<PurchaseOrder>>;
  let mockTxItemRepo: jest.Mocked<Repository<PurchaseOrderItem>>;
  let mockTxSupplierRepo: jest.Mocked<Repository<Supplier>>;
  let mockTxSpRepo: jest.Mocked<Repository<SupplierProduct>>;

  let mockPoRepo: jest.Mocked<Repository<PurchaseOrder>>;
  let mockItemRepo: jest.Mocked<Repository<PurchaseOrderItem>>;
  let mockSupplierRepo: jest.Mocked<Repository<Supplier>>;
  let mockSpRepo: jest.Mocked<Repository<SupplierProduct>>;

  const mockActorId = '11111111-1111-1111-1111-111111111111';
  const mockSupplierId = '22222222-2222-2222-2222-222222222222';
  const mockSpId1 = '33333333-3333-3333-3333-333333333331';
  const mockSpId2 = '33333333-3333-3333-3333-333333333332';
  const mockProductId1 = '44444444-4444-4444-4444-444444444441';
  const mockUnitId1 = '55555555-5555-5555-5555-555555555551';

  const sampleSupplier = {
    id: mockSupplierId,
    businessName: 'Droguería Médica S.A.',
    cuit: '30712345678',
    isActive: true,
  } as Supplier;

  const sampleSp1 = {
    id: mockSpId1,
    supplierId: mockSupplierId,
    productId: mockProductId1,
    purchaseUnitId: mockUnitId1,
    supplierExternalCode: 'MED-001',
    supplierDescription: 'Gasa estéril 10 x 10 cm',
    conversionFactorToBase: '10.0000',
    usualCostNet: '1250.5000',
    product: {
      id: mockProductId1,
      name: 'Gasa estéril 10 x 10 cm',
      internalCode: 'P0001',
      status: ProductStatus.ACTIVE,
    },
    purchaseUnit: {
      id: mockUnitId1,
      name: 'Paquete',
      symbol: 'paq',
    },
  } as unknown as SupplierProduct;

  const sampleSp2 = {
    id: mockSpId2,
    supplierId: mockSupplierId,
    productId: '44444444-4444-4444-4444-444444444442',
    purchaseUnitId: mockUnitId1,
    supplierExternalCode: 'SKU-00123',
    supplierDescription: 'Venda elástica',
    conversionFactorToBase: '1.0000',
    usualCostNet: null, // Test fallback requirement
    product: {
      id: '44444444-4444-4444-4444-444444444442',
      name: 'Venda elástica',
      internalCode: 'P0002',
      status: ProductStatus.ACTIVE,
    },
    purchaseUnit: {
      id: mockUnitId1,
      name: 'Unidad',
      symbol: 'un',
    },
  } as unknown as SupplierProduct;

  beforeEach(async () => {
    mockTxPoRepo = {
      findOne: jest.fn(),
      create: jest.fn((val) => ({
        ...val,
        id: 'po-1',
        orderNumber: 'OC-000001',
      })),
      save: jest.fn(async (val) => ({
        ...val,
        id: val.id || 'po-1',
        orderNumber: val.orderNumber || 'OC-000001',
      })),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<PurchaseOrder>>;

    mockTxItemRepo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((val) => ({ ...val, id: 'item-1' })),
      save: jest.fn(async (val) => val),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    } as unknown as jest.Mocked<Repository<PurchaseOrderItem>>;

    mockTxSupplierRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<Supplier>>;

    mockTxSpRepo = {
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<SupplierProduct>>;

    mockPoRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<PurchaseOrder>>;

    mockItemRepo = {} as unknown as jest.Mocked<Repository<PurchaseOrderItem>>;
    mockSupplierRepo = {} as unknown as jest.Mocked<Repository<Supplier>>;
    mockSpRepo = {} as unknown as jest.Mocked<Repository<SupplierProduct>>;

    mockEntityManager = {
      getRepository: jest.fn((entity) => {
        if (entity === PurchaseOrder) return mockTxPoRepo;
        if (entity === PurchaseOrderItem) return mockTxItemRepo;
        if (entity === Supplier) return mockTxSupplierRepo;
        if (entity === SupplierProduct) return mockTxSpRepo;
        return {};
      }),
    } as unknown as jest.Mocked<EntityManager>;

    dataSource = {
      transaction: jest.fn(async (cb) => cb(mockEntityManager)),
    } as unknown as jest.Mocked<DataSource>;

    mockAuditService = {
      record: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    } as unknown as jest.Mocked<AuditService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseOrdersService,
        { provide: DataSource, useValue: dataSource },
        { provide: AuditService, useValue: mockAuditService },
        {
          provide: getRepositoryToken(PurchaseOrder),
          useValue: mockPoRepo,
        },
        {
          provide: getRepositoryToken(PurchaseOrderItem),
          useValue: mockItemRepo,
        },
        { provide: getRepositoryToken(Supplier), useValue: mockSupplierRepo },
        {
          provide: getRepositoryToken(SupplierProduct),
          useValue: mockSpRepo,
        },
      ],
    }).compile();

    service = module.get<PurchaseOrdersService>(PurchaseOrdersService);
  });

  describe('create', () => {
    it('creates a draft purchase order with exact 4-decimal calculations and audit trail', async () => {
      mockTxSupplierRepo.findOne.mockResolvedValue(sampleSupplier);
      mockTxSpRepo.find.mockResolvedValue([sampleSp1]);

      mockTxPoRepo.findOne.mockResolvedValue({
        id: 'po-1',
        orderNumber: 'OC-000001',
        supplierId: mockSupplierId,
        status: PurchaseOrderStatus.BORRADOR,
        expectedDeliveryDate: '2026-09-01',
        notes: 'Urgente',
        totalNet: '30012.0000',
        userId: mockActorId,
        supplier: sampleSupplier,
        user: { id: mockActorId, name: 'Admin', email: 'admin@erp.com' },
        items: [
          {
            id: 'item-1',
            itemIndex: 1,
            supplierProductId: mockSpId1,
            productId: mockProductId1,
            purchaseUnitId: mockUnitId1,
            supplierSkuSnapshot: 'MED-001',
            productCodeSnapshot: 'P0001',
            productNameSnapshot: 'Gasa estéril 10 x 10 cm',
            purchaseUnitNameSnapshot: 'Paquete',
            purchaseUnitSymbolSnapshot: 'paq',
            conversionFactorSnapshot: '10.0000',
            orderedQty: '24.0000',
            receivedQty: '0.0000',
            expectedCostUnitNet: '1250.5000',
            subtotalNet: '30012.0000',
          } as PurchaseOrderItem,
        ],
      } as unknown as PurchaseOrder);

      const result = await service.create(
        {
          supplierId: mockSupplierId,
          expectedDeliveryDate: '2026-09-01',
          notes: 'Urgente',
          items: [{ supplierProductId: mockSpId1, orderedQty: 24 }],
        },
        mockActorId,
      );

      expect(result.orderNumber).toBe('OC-000001');
      expect(result.status).toBe(PurchaseOrderStatus.BORRADOR);
      expect(result.totalNet).toBe('30012.0000');
      expect(result.items[0].pendingQty).toBe('24.0000');
      expect(mockAuditService.record).toHaveBeenCalledWith(
        mockEntityManager,
        expect.objectContaining({
          action: AuditAction.CREATE,
          entityName: 'PurchaseOrder',
        }),
      );
    });

    it('rejects creation when supplier is inactive', async () => {
      mockTxSupplierRepo.findOne.mockResolvedValue({
        ...sampleSupplier,
        isActive: false,
      });

      await expect(
        service.create(
          {
            supplierId: mockSupplierId,
            items: [{ supplierProductId: mockSpId1, orderedQty: 10 }],
          },
          mockActorId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects creation with duplicate line items in payload', async () => {
      mockTxSupplierRepo.findOne.mockResolvedValue(sampleSupplier);

      await expect(
        service.create(
          {
            supplierId: mockSupplierId,
            items: [
              { supplierProductId: mockSpId1, orderedQty: 10 },
              { supplierProductId: mockSpId1, orderedQty: 5 },
            ],
          },
          mockActorId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects creation when expected cost is missing and usualCostNet is null', async () => {
      mockTxSupplierRepo.findOne.mockResolvedValue(sampleSupplier);
      mockTxSpRepo.find.mockResolvedValue([sampleSp2]);

      await expect(
        service.create(
          {
            supplierId: mockSupplierId,
            items: [{ supplierProductId: mockSpId2, orderedQty: 10 }],
          },
          mockActorId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('accepts explicit cost of 0', async () => {
      mockTxSupplierRepo.findOne.mockResolvedValue(sampleSupplier);
      mockTxSpRepo.find.mockResolvedValue([sampleSp2]);
      mockTxPoRepo.findOne.mockResolvedValue({
        id: 'po-1',
        orderNumber: 'OC-000001',
        supplierId: mockSupplierId,
        status: PurchaseOrderStatus.BORRADOR,
        totalNet: '0.0000',
        userId: mockActorId,
        items: [],
      } as unknown as PurchaseOrder);

      const result = await service.create(
        {
          supplierId: mockSupplierId,
          items: [
            {
              supplierProductId: mockSpId2,
              orderedQty: 10,
              expectedCostUnitNet: 0,
            },
          ],
        },
        mockActorId,
      );

      expect(result.totalNet).toBe('0.0000');
    });
  });

  describe('updateDraft', () => {
    it('updates draft notes and items atomically', async () => {
      const mockQb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'po-1',
          supplierId: mockSupplierId,
          status: PurchaseOrderStatus.BORRADOR,
          items: [],
        }),
      };
      mockTxPoRepo.createQueryBuilder.mockReturnValue(mockQb as any);
      mockTxSpRepo.find.mockResolvedValue([sampleSp1]);
      mockTxPoRepo.findOne.mockResolvedValue({
        id: 'po-1',
        orderNumber: 'OC-000001',
        supplierId: mockSupplierId,
        status: PurchaseOrderStatus.BORRADOR,
        totalNet: '1250.5000',
        userId: mockActorId,
        items: [],
      } as unknown as PurchaseOrder);

      const result = await service.updateDraft(
        'po-1',
        {
          notes: 'Updated note',
          items: [{ supplierProductId: mockSpId1, orderedQty: 1 }],
        },
        mockActorId,
      );

      expect(result.totalNet).toBe('1250.5000');
      expect(mockTxItemRepo.delete).toHaveBeenCalledWith({
        purchaseOrderId: 'po-1',
      });

      expect(mockAuditService.record).toHaveBeenCalledWith(
        mockEntityManager,
        expect.objectContaining({
          action: AuditAction.UPDATE,
          entityName: 'PurchaseOrder',
        }),
      );
    });

    it('rejects supplier change when new items are omitted', async () => {
      const mockQb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'po-1',
          supplierId: mockSupplierId,
          status: PurchaseOrderStatus.BORRADOR,
          items: [],
        }),
      };
      mockTxPoRepo.createQueryBuilder.mockReturnValue(mockQb as any);

      await expect(
        service.updateDraft(
          'po-1',
          { supplierId: '99999999-9999-9999-9999-999999999999' },
          mockActorId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects update when purchase order is not in BORRADOR', async () => {
      const mockQb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'po-1',
          supplierId: mockSupplierId,
          status: PurchaseOrderStatus.EMITIDA,
          items: [],
        }),
      };
      mockTxPoRepo.createQueryBuilder.mockReturnValue(mockQb as any);

      await expect(
        service.updateDraft('po-1', { notes: 'New note' }, mockActorId),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('emit', () => {
    it('transitions BORRADOR to EMITIDA when associations match snapshots', async () => {
      const mockPoQb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'po-1',
          supplierId: mockSupplierId,
          status: PurchaseOrderStatus.BORRADOR,
        }),
      };
      mockTxPoRepo.createQueryBuilder.mockReturnValue(mockPoQb as any);
      mockTxItemRepo.find.mockResolvedValue([
        {
          id: 'item-1',
          supplierProductId: mockSpId1,
          productId: mockProductId1,
          purchaseUnitId: mockUnitId1,
          supplierSkuSnapshot: 'MED-001',
          conversionFactorSnapshot: '10.0000',
        } as PurchaseOrderItem,
      ]);

      const mockSupplierQb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(sampleSupplier),
      };
      mockTxSupplierRepo.createQueryBuilder.mockReturnValue(
        mockSupplierQb as any,
      );

      const mockSpQb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([sampleSp1]),
      };
      mockTxSpRepo.createQueryBuilder.mockReturnValue(mockSpQb as any);

      mockTxPoRepo.findOne.mockResolvedValue({
        id: 'po-1',
        orderNumber: 'OC-000001',
        supplierId: mockSupplierId,
        status: PurchaseOrderStatus.EMITIDA,
        emittedAt: new Date(),
        totalNet: '12505.0000',
        items: [],
      } as unknown as PurchaseOrder);

      const result = await service.emit('po-1', mockActorId);

      expect(result.status).toBe(PurchaseOrderStatus.EMITIDA);
      expect(mockAuditService.record).toHaveBeenCalledWith(
        mockEntityManager,
        expect.objectContaining({
          action: AuditAction.UPDATE,
          entityName: 'PurchaseOrder',
          newValues: expect.objectContaining({
            status: PurchaseOrderStatus.EMITIDA,
          }),
        }),
      );
    });

    it('rejects emission when structural drift is detected in conversionFactorToBase', async () => {
      const mockPoQb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'po-1',
          supplierId: mockSupplierId,
          status: PurchaseOrderStatus.BORRADOR,
        }),
      };
      mockTxPoRepo.createQueryBuilder.mockReturnValue(mockPoQb as any);
      mockTxItemRepo.find.mockResolvedValue([
        {
          id: 'item-1',
          supplierProductId: mockSpId1,
          productId: mockProductId1,
          purchaseUnitId: mockUnitId1,
          supplierSkuSnapshot: 'MED-001',
          conversionFactorSnapshot: '10.0000',
        } as PurchaseOrderItem,
      ]);

      const mockSupplierQb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(sampleSupplier),
      };
      mockTxSupplierRepo.createQueryBuilder.mockReturnValue(
        mockSupplierQb as any,
      );

      // Modified factor from 10 to 12
      const modifiedSp = { ...sampleSp1, conversionFactorToBase: '12.0000' };
      const mockSpQb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([modifiedSp]),
      };
      mockTxSpRepo.createQueryBuilder.mockReturnValue(mockSpQb as any);

      await expect(service.emit('po-1', mockActorId)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('cancel', () => {
    it('cancels an EMITIDA purchase order with cancelReason', async () => {
      const mockQb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'po-1',
          status: PurchaseOrderStatus.EMITIDA,
        }),
      };
      mockTxPoRepo.createQueryBuilder.mockReturnValue(mockQb as any);
      mockTxPoRepo.findOne.mockResolvedValue({
        id: 'po-1',
        orderNumber: 'OC-000001',
        status: PurchaseOrderStatus.CANCELADA,
        cancelReason: 'Proveedor sin stock',
        cancelledAt: new Date(),
        totalNet: '1000.0000',
        items: [],
      } as unknown as PurchaseOrder);

      const result = await service.cancel(
        'po-1',
        { cancelReason: 'Proveedor sin stock' },
        mockActorId,
      );

      expect(result.status).toBe(PurchaseOrderStatus.CANCELADA);
      expect(result.cancelReason).toBe('Proveedor sin stock');
    });

    it('rejects cancellation when purchase order is in terminal status COMPLETADA', async () => {
      const mockQb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'po-1',
          status: PurchaseOrderStatus.COMPLETADA,
        }),
      };
      mockTxPoRepo.createQueryBuilder.mockReturnValue(mockQb as any);

      await expect(
        service.cancel('po-1', { cancelReason: 'Test' }, mockActorId),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll and findOne', () => {
    it('returns paginated purchase orders with semi-open UTC date filters', async () => {
      const mockQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([
          [
            {
              id: 'po-1',
              orderNumber: 'OC-000001',
              supplierId: mockSupplierId,
              status: PurchaseOrderStatus.BORRADOR,
              totalNet: '100.0000',
              items: [{ id: 'item-1' }],
            },
          ],
          1,
        ]),
      };
      mockPoRepo.createQueryBuilder.mockReturnValue(mockQb as any);

      const result = await service.findAll({
        dateFrom: '2026-08-25',
        dateTo: '2026-08-26',
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'po.createdAt >= :dateFromStart',
        expect.anything(),
      );
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'po.createdAt < :dateToEndExclusive',
        expect.anything(),
      );
    });

    it('throws NotFoundException when findOne does not match', async () => {
      mockPoRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
