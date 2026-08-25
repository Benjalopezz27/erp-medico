import type { ISupplierProductSearchParams } from '../types/supplier-products.types';

export const supplierProductsKeys = {
  all: ['supplier-products'] as const,
  lists: () => [...supplierProductsKeys.all, 'list'] as const,
  list: (supplierId: string, params: ISupplierProductSearchParams) =>
    [...supplierProductsKeys.lists(), supplierId, params] as const,
  details: () => [...supplierProductsKeys.all, 'detail'] as const,
  detail: (supplierId: string, associationId: string) =>
    [...supplierProductsKeys.details(), supplierId, associationId] as const,
};
