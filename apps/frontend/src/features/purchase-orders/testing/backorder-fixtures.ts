import { PurchaseOrderStatus } from '../types/purchase-orders.types';
import type { IBackordersResponse } from '../types/purchase-orders.types';

export const backordersFixture: IBackordersResponse = {
  generatedAt: '2026-08-27T15:00:00.000Z',
  summary: {
    supplierCount: 1,
    orderCount: 1,
    pendingProductCount: 1,
    pendingLineCount: 1,
    urgentOrderCount: 1,
  },
  groups: [
    {
      supplier: {
        id: '11111111-1111-4111-8111-111111111111',
        businessName: 'Droguería Central',
        cuit: '30712345678',
      },
      orderCount: 1,
      pendingProductCount: 1,
      pendingLineCount: 1,
      urgentOrderCount: 1,
      orders: [
        {
          id: '22222222-2222-4222-8222-222222222222',
          orderNumber: 'OC-000123',
          status: PurchaseOrderStatus.PARCIAL,
          emittedAt: '2026-08-10T13:00:00.000Z',
          expectedDeliveryDate: '2026-08-17',
          ageDays: 17,
          isUrgent: true,
          pendingLineCount: 1,
          items: [
            {
              purchaseOrderItemId: '33333333-3333-4333-8333-333333333333',
              productId: '44444444-4444-4444-8444-444444444444',
              productCode: 'P0001',
              productName: 'Gasa estéril',
              supplierSku: 'GAS-10',
              purchaseUnitName: 'Caja',
              purchaseUnitSymbol: 'cja',
              orderedQty: '10.0000',
              receivedQty: '4.0000',
              pendingQty: '6.0000',
            },
          ],
        },
      ],
    },
  ],
};
