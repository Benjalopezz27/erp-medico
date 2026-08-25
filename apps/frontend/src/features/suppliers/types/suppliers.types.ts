import {
  ISupplier,
  TaxCondition,
  ISupplierSearchParams,
  SupplierSortField,
} from '@erp/shared-types';

export type { ISupplier, TaxCondition, ISupplierSearchParams, SupplierSortField };

export interface PaginatedSuppliersResponse {
  data: ISupplier[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface CreateSupplierPayload {
  businessName: string;
  cuit: string;
  taxCondition: TaxCondition;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  address?: string | null;
}

export interface UpdateSupplierPayload {
  businessName?: string;
  cuit?: string;
  taxCondition?: TaxCondition;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  isActive?: boolean;
}
