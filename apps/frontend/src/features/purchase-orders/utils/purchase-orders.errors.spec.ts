import { PurchaseOrderErrorCode } from '@erp/shared-types';
import { getPurchaseOrderErrorMessage } from './purchase-orders.errors';

describe('Purchase Orders Error Mapper', () => {
  it('prioritizes specific PurchaseOrderErrorCode over HTTP 409 status', () => {
    const error = {
      response: {
        status: 409,
        data: {
          code: PurchaseOrderErrorCode.PURCHASE_ORDER_ASSOCIATION_CHANGED,
          message: 'Conflict error',
        },
      },
    };

    const msg = getPurchaseOrderErrorMessage(error);
    expect(msg).toBe(
      'La configuración del producto en el catálogo del proveedor cambió. Revise los ítems antes de continuar.',
    );
  });

  it('prioritizes PURCHASE_ORDER_CANNOT_EDIT_NON_DRAFT over HTTP 409 status', () => {
    const error = {
      response: {
        status: 409,
        data: {
          code: PurchaseOrderErrorCode.PURCHASE_ORDER_CANNOT_EDIT_NON_DRAFT,
        },
      },
    };

    const msg = getPurchaseOrderErrorMessage(error);
    expect(msg).toBe('Solo las órdenes de compra en estado BORRADOR pueden ser editadas.');
  });

  it('maps PURCHASE_ORDER_COST_REQUIRED correctly', () => {
    const error = {
      response: {
        status: 400,
        data: {
          code: PurchaseOrderErrorCode.PURCHASE_ORDER_COST_REQUIRED,
        },
      },
    };

    const msg = getPurchaseOrderErrorMessage(error);
    expect(msg).toBe(
      'El costo unitario es obligatorio porque el producto no tiene costo habitual configurado.',
    );
  });

  it('falls back to generic HTTP 409 concurrency error when no code is present', () => {
    const error = {
      response: {
        status: 409,
        data: {},
      },
    };

    const msg = getPurchaseOrderErrorMessage(error);
    expect(msg).toBe(
      'Conflicto de concurrencia: la orden de compra fue modificada por otro usuario.',
    );
  });

  it('falls back to generic HTTP 404 when no code is present', () => {
    const error = {
      response: {
        status: 404,
        data: {},
      },
    };

    const msg = getPurchaseOrderErrorMessage(error);
    expect(msg).toBe('La orden de compra no existe o no pudo encontrarse.');
  });

  it('includes requestId when unexpected error occurs', () => {
    const error = {
      response: {
        status: 500,
        data: {
          requestId: 'req-abc-123',
        },
      },
    };

    const msg = getPurchaseOrderErrorMessage(error);
    expect(msg).toBe(
      'Se produjo un error inesperado al procesar la orden de compra. (ID: req-abc-123)',
    );
  });

  it('handles non-object and null errors safely', () => {
    expect(getPurchaseOrderErrorMessage(null)).toBe(
      'Se produjo un error inesperado al procesar la orden de compra.',
    );
    expect(getPurchaseOrderErrorMessage('Unexpected')).toBe(
      'Se produjo un error inesperado al procesar la orden de compra.',
    );
  });
});
