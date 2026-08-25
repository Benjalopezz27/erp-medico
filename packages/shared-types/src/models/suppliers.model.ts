import { TaxCondition } from '../enums/financial.enum';
import { IUnitSummary } from './catalog.model';

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

export interface ISupplierProductProductSummary {
  id: string;
  internalCode: string;
  name: string;
  baseUnit: IUnitSummary;
}

export interface ISupplierProduct {
  id: string;
  supplierId: string;
  productId: string;
  supplierExternalCode: string;
  supplierDescription?: string | null;
  purchaseUnitId: string;
  conversionFactorToBase: number;
  usualCostNet?: number | null;
  isPrimarySupplier: boolean;
  product?: ISupplierProductProductSummary;
  purchaseUnit?: IUnitSummary;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type SupplierProductSortField =
  | 'supplierExternalCode'
  | 'productInternalCode'
  | 'productName'
  | 'isPrimarySupplier'
  | 'createdAt'
  | 'updatedAt';

export interface ISupplierProductSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: SupplierProductSortField;
  sortOrder?: 'ASC' | 'DESC';
}

export interface ISupplierImportTemplate {
  id: string;
  supplierId: string;
  templateName: string;
  columnMappingJSON: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}
