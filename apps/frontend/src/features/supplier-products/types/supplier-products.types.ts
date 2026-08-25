import type {
  ISupplierProduct,
  ISupplierProductProductSummary,
  ISupplierProductSearchParams,
  SupplierProductSortField,
  IUnitSummary,
} from '@erp/shared-types';

export type {
  ISupplierProduct,
  ISupplierProductProductSummary,
  ISupplierProductSearchParams,
  SupplierProductSortField,
  IUnitSummary,
};

export interface CreateSupplierProductPayload {
  productId: string;
  supplierExternalCode: string;
  supplierDescription?: string | null;
  purchaseUnitId: string;
  conversionFactorToBase: number;
  usualCostNet?: number | null;
  isPrimarySupplier?: boolean;
}

export interface UpdateSupplierProductPayload {
  supplierExternalCode?: string;
  supplierDescription?: string | null;
  purchaseUnitId?: string;
  conversionFactorToBase?: number;
  usualCostNet?: number | null;
  isPrimarySupplier?: boolean;
}

export interface PaginatedSupplierProductsResponse {
  data: ISupplierProduct[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
