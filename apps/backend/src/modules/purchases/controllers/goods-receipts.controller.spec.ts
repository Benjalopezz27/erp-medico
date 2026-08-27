import { Test, TestingModule } from '@nestjs/testing';
import { GoodsReceiptsController } from './goods-receipts.controller';
import { GoodsReceiptsService } from '../services/goods-receipts.service';
import { User } from '../../users/entities/user.entity';
import { PurchaseOrderStatus } from '@erp/shared-types';

describe('GoodsReceiptsController', () => {
  let controller: GoodsReceiptsController;
  let service: jest.Mocked<GoodsReceiptsService>;

  const mockUser = {
    id: 'user-uuid-1',
    email: 'admin@erp.com',
  } as User;

  beforeEach(async () => {
    service = {
      createGoodsReceipt: jest.fn(),
      findGoodsReceiptsByPurchaseOrder: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GoodsReceiptsController],
      providers: [{ provide: GoodsReceiptsService, useValue: service }],
    }).compile();

    controller = module.get<GoodsReceiptsController>(GoodsReceiptsController);
  });

  describe('create', () => {
    it('delegates goods receipt creation to service', async () => {
      const dto = {
        deliveryNoteNumber: '0001-00001234',
        items: [
          {
            purchaseOrderItemId: 'poi-uuid-1',
            receivedQtyPurchaseUnit: 10,
          },
        ],
      };

      const mockResponse: any = {
        receipt: {
          id: 'gr-uuid-1',
          receiptNumber: 'REC-000001',
        },
        resultingPurchaseOrder: {
          id: 'po-uuid-1',
          status: PurchaseOrderStatus.COMPLETADA,
        },
      };

      service.createGoodsReceipt.mockResolvedValueOnce(mockResponse);

      const result = await controller.create('po-uuid-1', dto, mockUser);

      expect(service.createGoodsReceipt).toHaveBeenCalledWith(
        'po-uuid-1',
        dto,
        'user-uuid-1',
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('findAll', () => {
    it('delegates finding receipts to service with query pagination params', async () => {
      const mockQuery = { page: 2, limit: 10 };
      const mockPaginatedResponse: any = {
        data: [],
        meta: { total: 0, page: 2, limit: 10 },
      };

      service.findGoodsReceiptsByPurchaseOrder.mockResolvedValueOnce(
        mockPaginatedResponse,
      );

      const result = await controller.findAll('po-uuid-1', mockQuery);

      expect(service.findGoodsReceiptsByPurchaseOrder).toHaveBeenCalledWith(
        'po-uuid-1',
        mockQuery,
      );
      expect(result).toEqual(mockPaginatedResponse);
    });
  });
});
