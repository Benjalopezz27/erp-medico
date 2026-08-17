export interface ISupplier {
  id: string;
  businessName: string;
  cuit: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
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
