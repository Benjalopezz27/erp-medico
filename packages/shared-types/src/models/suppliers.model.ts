import { TaxCondition } from '../enums/financial.enum';

export interface ISupplier {
  id: string;
  businessName: string;
  cuit: string;
  taxCondition: TaxCondition;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type SupplierSortField =
  'businessName' | 'cuit' | 'taxCondition' | 'createdAt' | 'updatedAt';

export interface ISupplierSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: SupplierSortField;
  sortOrder?: 'ASC' | 'DESC';
}

export interface ISupplierProduct {
  id: string;
  supplierId: string;
  productId: string;
  supplierExternalCode: string;
  supplierDescription?: string | null;
  purchaseUnitId?: string | null;
  conversionFactorToBase: number;
  usualCostNet?: number | null;
  isPrimarySupplier: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ISupplierImportTemplate {
  id: string;
  supplierId: string;
  templateName: string;
  columnMappingJSON: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}
