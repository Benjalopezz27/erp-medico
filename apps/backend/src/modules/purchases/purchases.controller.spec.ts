import { Test, TestingModule } from '@nestjs/testing';
import { PurchasesController } from './purchases.controller';
import { PurchaseOrdersService } from './services/purchase-orders.service';
import { BackordersService } from './services/backorders.service';
import { PurchaseOrderStatus, UserRole } from '@erp/shared-types';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

describe('PurchasesController Unit Tests', () => {
  let controller: PurchasesController;
  let service: jest.Mocked<PurchaseOrdersService>;
  let backordersService: jest.Mocked<BackordersService>;

  const mockAdminUser: AuthenticatedUser = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Admin Tester',
    email: 'admin@erp.com',
    role: UserRole.ADMINISTRADOR,
    isActive: true,
  };

  const sampleDetail = {
    id: 'po-1',
    orderNumber: 'OC-000001',
    supplier: {
      id: 'sup-1',
      businessName: 'Droguería Médica',
      cuit: '30712345678',
    },
    status: PurchaseOrderStatus.BORRADOR,
    expectedDeliveryDate: '2026-09-01',
    notes: 'Urgente',
    totalNet: '12505.0000',
    itemsCount: 1,
    user: { id: mockAdminUser.id, name: 'Admin', email: 'admin@erp.com' },
    emittedAt: null,
    cancelledAt: null,
    cancelReason: null,
    createdAt: '2026-08-26T15:00:00.000Z',
    updatedAt: '2026-08-26T15:00:00.000Z',
    items: [],
  };

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue(sampleDetail),
      updateDraft: jest.fn().mockResolvedValue(sampleDetail),
      findAll: jest.fn().mockResolvedValue({ data: [sampleDetail], meta: {} }),
      findOne: jest.fn().mockResolvedValue(sampleDetail),
      emit: jest.fn().mockResolvedValue({
        ...sampleDetail,
        status: PurchaseOrderStatus.EMITIDA,
        emittedAt: '2026-08-26T15:30:00.000Z',
      }),
      cancel: jest.fn().mockResolvedValue({
        ...sampleDetail,
        status: PurchaseOrderStatus.CANCELADA,
        cancelledAt: '2026-08-26T15:40:00.000Z',
      }),
    } as unknown as jest.Mocked<PurchaseOrdersService>;
    backordersService = {
      findPending: jest.fn().mockResolvedValue({
        generatedAt: '2026-08-27T15:00:00.000Z',
        summary: {
          supplierCount: 0,
          orderCount: 0,
          pendingProductCount: 0,
          pendingLineCount: 0,
          urgentOrderCount: 0,
        },
        groups: [],
      }),
    } as unknown as jest.Mocked<BackordersService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PurchasesController],
      providers: [
        { provide: PurchaseOrdersService, useValue: service },
        { provide: BackordersService, useValue: backordersService },
      ],
    }).compile();

    controller = module.get<PurchasesController>(PurchasesController);
  });

  it('delegates create to service with authenticated user ID', async () => {
    const dto = {
      supplierId: 'sup-1',
      items: [{ supplierProductId: 'sp-1', orderedQty: 10 }],
    };

    const res = await controller.create(dto, mockAdminUser);
    expect(res).toEqual(sampleDetail);
    expect(service.create).toHaveBeenCalledWith(dto, mockAdminUser.id);
  });

  it('delegates updateDraft to service', async () => {
    const dto = { notes: 'Updated note' };
    const res = await controller.updateDraft('po-1', dto, mockAdminUser);
    expect(res).toEqual(sampleDetail);
    expect(service.updateDraft).toHaveBeenCalledWith(
      'po-1',
      dto,
      mockAdminUser.id,
    );
  });

  it('delegates findAll to service with query params', async () => {
    const query = { page: 1, limit: 20 };
    const res = await controller.findAll(query);
    expect(res.data).toHaveLength(1);
    expect(service.findAll).toHaveBeenCalledWith(query);
  });

  it('delegates findOne to service', async () => {
    const res = await controller.findOne('po-1');
    expect(res.id).toBe('po-1');
    expect(service.findOne).toHaveBeenCalledWith('po-1');
  });

  it('delegates pending backorders query to the dedicated service', async () => {
    const query = { search: 'gasa', urgentOnly: true };

    const result = await controller.findPending(query);

    expect(result.groups).toEqual([]);
    expect(backordersService.findPending).toHaveBeenCalledWith(query);
  });

  it('delegates emit to service', async () => {
    const res = await controller.emit('po-1', mockAdminUser);
    expect(res.status).toBe(PurchaseOrderStatus.EMITIDA);
    expect(service.emit).toHaveBeenCalledWith('po-1', mockAdminUser.id);
  });

  it('delegates cancel to service', async () => {
    const dto = { cancelReason: 'Proveedor sin stock' };
    const res = await controller.cancel('po-1', dto, mockAdminUser);
    expect(res.status).toBe(PurchaseOrderStatus.CANCELADA);
    expect(service.cancel).toHaveBeenCalledWith('po-1', dto, mockAdminUser.id);
  });
});
