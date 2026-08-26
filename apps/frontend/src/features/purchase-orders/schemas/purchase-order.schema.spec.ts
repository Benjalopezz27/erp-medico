import {
  purchaseOrderFormSchema,
  purchaseOrderItemSchema,
  mapFormToCreatePayload,
  mapFormToUpdatePayload,
} from './purchase-order.schema';

describe('Purchase Order Schema & Mappers', () => {
  const validItem = {
    supplierProductId: '4659b877-d975-4d1e-bcf4-94c80efa2c4c',
    productId: '5a678d42-7595-4da6-a739-8f3eec6a5c22',
    productInternalCode: 'MED-001',
    productName: 'Jeringa Descartable 5ml',
    supplierSku: 'JER-5ML',
    purchaseUnitName: 'Caja x 100',
    purchaseUnitSymbol: 'CJA',
    conversionFactorToBase: 100,
    baseUnitSymbol: 'UN',
    usualCostNet: 1500,
    orderedQty: '10',
    expectedCostUnitNet: '1500.50',
  };

  const validForm = {
    supplierId: '7779b877-d975-4d1e-bcf4-94c80efa2777',
    expectedDeliveryDate: '2026-09-15',
    notes: 'Entrega en depósito central',
    items: [validItem],
  };

  describe('Validation Rules', () => {
    it('validates a correct form successfully', () => {
      const result = purchaseOrderFormSchema.safeParse(validForm);
      expect(result.success).toBe(true);
    });

    it('fails when supplierId is missing or not a valid UUID', () => {
      const result = purchaseOrderFormSchema.safeParse({
        ...validForm,
        supplierId: 'invalid-id',
      });
      expect(result.success).toBe(false);
    });

    it('fails when items array is empty', () => {
      const result = purchaseOrderFormSchema.safeParse({
        ...validForm,
        items: [],
      });
      expect(result.success).toBe(false);
    });

    it('fails when items contain duplicate supplierProductId', () => {
      const result = purchaseOrderFormSchema.safeParse({
        ...validForm,
        items: [validItem, validItem],
      });
      expect(result.success).toBe(false);
    });

    it('fails when expectedCostUnitNet is empty or missing (mandatory explicit cost)', () => {
      const result = purchaseOrderItemSchema.safeParse({
        ...validItem,
        expectedCostUnitNet: '',
      });
      expect(result.success).toBe(false);
    });

    it('fails when orderedQty has more than 4 decimal places', () => {
      const result = purchaseOrderItemSchema.safeParse({
        ...validItem,
        orderedQty: '10.12345',
      });
      expect(result.success).toBe(false);
    });

    it('fails when expectedCostUnitNet is negative', () => {
      const result = purchaseOrderItemSchema.safeParse({
        ...validItem,
        expectedCostUnitNet: '-10.50',
      });
      expect(result.success).toBe(false);
    });

    it('fails when expectedDeliveryDate is not a real calendar date (e.g. 2026-02-31)', () => {
      const result = purchaseOrderFormSchema.safeParse({
        ...validForm,
        expectedDeliveryDate: '2026-02-31',
      });
      expect(result.success).toBe(false);
    });

    it('fails when item has isDeletedAssociation set to true', () => {
      const result = purchaseOrderItemSchema.safeParse({
        ...validItem,
        isDeletedAssociation: true,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Payload Mappers', () => {
    it('maps form to create payload with exact numeric types at the boundary', () => {
      const payload = mapFormToCreatePayload(validForm);
      expect(payload).toEqual({
        supplierId: '7779b877-d975-4d1e-bcf4-94c80efa2777',
        expectedDeliveryDate: '2026-09-15',
        notes: 'Entrega en depósito central',
        items: [
          {
            supplierProductId: '4659b877-d975-4d1e-bcf4-94c80efa2c4c',
            orderedQty: 10,
            expectedCostUnitNet: 1500.5,
          },
        ],
      });
    });

    it('maps null optional fields cleanly', () => {
      const payload = mapFormToUpdatePayload({
        ...validForm,
        expectedDeliveryDate: '',
        notes: '',
      });
      expect(payload.expectedDeliveryDate).toBeNull();
      expect(payload.notes).toBeNull();
    });
  });
});
