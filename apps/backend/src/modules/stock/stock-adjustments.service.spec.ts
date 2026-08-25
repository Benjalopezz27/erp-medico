import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  ProductStatus,
  StockMovementType,
  AuditAction,
  UserRole,
} from '@erp/shared-types';
import { StockAdjustmentsService } from './stock-adjustments.service';
import { StockService } from './stock.service';
import { AuditService } from '../audit/audit.service';
import { Product } from '../products/entities/product.entity';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { InsufficientStockException } from './exceptions';

describe('StockAdjustmentsService', () => {
  let service: StockAdjustmentsService;
  let mockStockService: any;
  let mockAuditService: any;
  let mockManager: any;
  let mockDataSource: any;

  const mockActor: AuthenticatedUser = {
    id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03',
    email: 'admin@erp.com',
    name: 'Admin User',
    role: UserRole.ADMINISTRADOR,
    isActive: true,
  };

  const mockActiveProduct = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    internalCode: 'P0001',
    name: 'Ibuprofeno 400mg',
    status: ProductStatus.ACTIVE,
  };

  const mockInactiveProduct = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
    internalCode: 'P0002',
    name: 'Producto Inactivo',
    status: ProductStatus.INACTIVE,
  };

  const mockMovementResponse = {
    id: 'm0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
    productId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    movementType: StockMovementType.AJUSTE_ENTRADA,
    quantityBase: 15,
    previousStock: 100,
    subsequentStock: 115,
    reason: 'Ajuste mensual',
    documentReference: 'ACTA-001',
    userId: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    mockManager = {
      findOneBy: jest.fn(async (entityClass: any, criteria: any) => {
        if (entityClass === Product) {
          if (criteria?.id === 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11') {
            return mockActiveProduct;
          }
          if (criteria?.id === 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12') {
            return mockInactiveProduct;
          }
        }
        return null;
      }),
    };

    mockDataSource = {
      transaction: jest.fn(async (cb: (mgr: any) => Promise<any>) =>
        cb(mockManager),
      ),
    };

    mockStockService = {
      recordMovement: jest.fn().mockResolvedValue(mockMovementResponse),
    };

    mockAuditService = {
      record: jest.fn().mockResolvedValue({ id: 'audit-log-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockAdjustmentsService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: StockService, useValue: mockStockService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<StockAdjustmentsService>(StockAdjustmentsService);
  });

  it('throws NotFoundException when product does not exist', async () => {
    await expect(
      service.createAdjustment(
        {
          productId: 'non-existent-uuid',
          movementType: StockMovementType.AJUSTE_ENTRADA,
          quantityBase: 10,
          reason: 'Test',
        },
        mockActor,
      ),
    ).rejects.toThrow(NotFoundException);

    expect(mockStockService.recordMovement).not.toHaveBeenCalled();
    expect(mockAuditService.record).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when product is inactive', async () => {
    await expect(
      service.createAdjustment(
        {
          productId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
          movementType: StockMovementType.AJUSTE_ENTRADA,
          quantityBase: 10,
          reason: 'Test',
        },
        mockActor,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(mockStockService.recordMovement).not.toHaveBeenCalled();
    expect(mockAuditService.record).not.toHaveBeenCalled();
  });

  it('successfully creates adjustment and records atomic audit log', async () => {
    const res = await service.createAdjustment(
      {
        productId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        movementType: StockMovementType.AJUSTE_ENTRADA,
        quantityBase: 15,
        reason: 'Ajuste mensual',
        documentReference: 'ACTA-001',
      },
      mockActor,
    );

    expect(mockDataSource.transaction).toHaveBeenCalled();
    expect(mockStockService.recordMovement).toHaveBeenCalledWith(
      {
        productId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        movementType: StockMovementType.AJUSTE_ENTRADA,
        quantityBase: 15,
        reason: 'Ajuste mensual',
        documentReference: 'ACTA-001',
        userId: mockActor.id,
      },
      mockManager,
    );

    expect(mockAuditService.record).toHaveBeenCalledWith(mockManager, {
      actorId: mockActor.id,
      action: AuditAction.UPDATE,
      entityName: 'Stock',
      entityId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      previousValues: {
        productId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        currentBaseStock: 100,
      },
      newValues: {
        productId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        movementId: mockMovementResponse.id,
        movementType: StockMovementType.AJUSTE_ENTRADA,
        quantityBase: 15,
        previousStock: 100,
        subsequentStock: 115,
        reason: 'Ajuste mensual',
        documentReference: 'ACTA-001',
      },
    });

    expect(res).toEqual(mockMovementResponse);
  });

  it('participates in an existing transaction when a manager is provided', async () => {
    const res = await service.createAdjustment(
      {
        productId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        movementType: StockMovementType.AJUSTE_ENTRADA,
        quantityBase: 15,
        reason: 'Stock inicial al crear el producto',
      },
      mockActor,
      mockManager,
    );

    expect(mockDataSource.transaction).not.toHaveBeenCalled();
    expect(mockStockService.recordMovement).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: mockActiveProduct.id,
        movementType: StockMovementType.AJUSTE_ENTRADA,
        quantityBase: 15,
        userId: mockActor.id,
      }),
      mockManager,
    );
    expect(mockAuditService.record).toHaveBeenCalledWith(
      mockManager,
      expect.objectContaining({ entityName: 'Stock' }),
    );
    expect(res).toEqual(mockMovementResponse);
  });

  it('propagates InsufficientStockException and does not record audit log', async () => {
    mockStockService.recordMovement.mockRejectedValueOnce(
      new InsufficientStockException({
        productId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        available: 5,
        requested: 10,
      }),
    );

    await expect(
      service.createAdjustment(
        {
          productId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          movementType: StockMovementType.AJUSTE_SALIDA,
          quantityBase: 10,
          reason: 'Ajuste excesivo',
        },
        mockActor,
      ),
    ).rejects.toThrow(InsufficientStockException);

    expect(mockAuditService.record).not.toHaveBeenCalled();
  });
});
