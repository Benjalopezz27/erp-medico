import { PurchaseOrderErrorCode } from '@erp/shared-types';

export function getPurchaseOrderErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'Se produjo un error inesperado al procesar la orden de compra.';
  }

  const err = error as any;
  const responseData = err.response?.data;
  const errorCode: PurchaseOrderErrorCode | undefined = responseData?.code;
  const status: number | undefined = err.response?.status;
  const requestId: string | undefined = responseData?.requestId;

  // 1. Exact Error Code Match (Highest Precedence)
  if (errorCode) {
    switch (errorCode) {
      case PurchaseOrderErrorCode.PURCHASE_ORDER_NOT_FOUND:
        return 'La orden de compra no existe o no pudo encontrarse.';
      case PurchaseOrderErrorCode.PURCHASE_ORDER_INVALID_STATUS:
        return 'La orden de compra no se encuentra en un estado válido para esta operación.';
      case PurchaseOrderErrorCode.PURCHASE_ORDER_CANNOT_EDIT_NON_DRAFT:
        return 'Solo las órdenes de compra en estado BORRADOR pueden ser editadas.';
      case PurchaseOrderErrorCode.PURCHASE_ORDER_CANNOT_EMIT_NON_DRAFT:
        return 'Solo las órdenes de compra en estado BORRADOR pueden ser emitidas.';
      case PurchaseOrderErrorCode.PURCHASE_ORDER_CANNOT_CANCEL:
        return 'La orden de compra se encuentra en un estado terminal y no puede ser cancelada.';
      case PurchaseOrderErrorCode.PURCHASE_ORDER_EMPTY_ITEMS:
        return 'La orden de compra debe contener al menos un ítem.';
      case PurchaseOrderErrorCode.PURCHASE_ORDER_DUPLICATE_ITEM:
        return 'No se pueden incluir productos duplicados en la misma orden de compra.';
      case PurchaseOrderErrorCode.PURCHASE_ORDER_SUPPLIER_NOT_FOUND:
        return 'El proveedor seleccionado no existe o no fue encontrado.';
      case PurchaseOrderErrorCode.PURCHASE_ORDER_SUPPLIER_INACTIVE:
        return 'El proveedor seleccionado se encuentra inactivo y no puede recibir nuevas órdenes.';
      case PurchaseOrderErrorCode.PURCHASE_ORDER_SUPPLIER_CHANGE_REQUIRES_ITEMS:
        return 'Al cambiar el proveedor deben especificarse nuevamente los ítems de su catálogo.';
      case PurchaseOrderErrorCode.PURCHASE_ORDER_PRODUCT_NOT_FOUND:
        return 'Uno de los productos seleccionados no existe.';
      case PurchaseOrderErrorCode.PURCHASE_ORDER_PRODUCT_INACTIVE:
        return 'Uno de los productos seleccionados se encuentra inactivo.';
      case PurchaseOrderErrorCode.PURCHASE_ORDER_SUPPLIER_PRODUCT_NOT_FOUND:
        return 'La asociación del producto con el proveedor no fue encontrada en el catálogo.';
      case PurchaseOrderErrorCode.PURCHASE_ORDER_SUPPLIER_PRODUCT_MISMATCH:
        return 'El producto seleccionado no pertenece al catálogo del proveedor elegido.';
      case PurchaseOrderErrorCode.PURCHASE_ORDER_ASSOCIATION_CHANGED:
        return 'La configuración del producto en el catálogo del proveedor cambió. Revise los ítems antes de continuar.';
      case PurchaseOrderErrorCode.PURCHASE_ORDER_INVALID_EXPECTED_DELIVERY_DATE:
        return 'La fecha esperada de entrega no tiene un formato válido (AAAA-MM-DD).';
      case PurchaseOrderErrorCode.PURCHASE_ORDER_INVALID_QUANTITY:
        return 'La cantidad especificada es inválida (debe ser positiva con hasta 4 decimales).';
      case PurchaseOrderErrorCode.PURCHASE_ORDER_INVALID_COST:
        return 'El costo especificado es inválido (debe ser mayor o igual a 0 con hasta 4 decimales).';
      case PurchaseOrderErrorCode.PURCHASE_ORDER_COST_REQUIRED:
        return 'El costo unitario es obligatorio porque el producto no tiene costo habitual configurado.';
    }
  }

  // 2. HTTP Status Code Fallbacks (Lower Precedence)
  if (status === 409) {
    return 'Conflicto de concurrencia: la orden de compra fue modificada por otro usuario.';
  }
  if (status === 404) {
    return 'La orden de compra no existe o no pudo encontrarse.';
  }
  if (status === 403) {
    return 'No tiene permisos suficientes para realizar esta acción (requiere Administrador).';
  }
  if (status === 401) {
    return 'Su sesión ha expirado o no está autenticado.';
  }

  // 3. Fallback to API message or generic error with Request ID
  if (Array.isArray(responseData?.message)) {
    return responseData.message.join(', ');
  }

  if (typeof responseData?.message === 'string' && responseData.message.trim() !== '') {
    return responseData.message;
  }

  if (requestId) {
    return `Se produjo un error inesperado al procesar la orden de compra. (ID: ${requestId})`;
  }

  return 'Se produjo un error inesperado al procesar la orden de compra.';
}
