import type { ProductStatus, ProductTaxTreatment } from '../enums/catalog.enum';

export interface ICategory {
  id: string;
  name: string;
  description?: string | null;
  defaultMarkupPercentage?: number | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IUnit {
  id: string;
  name: string;
  symbol: string;
  isBaseUnit?: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IUnitSummary {
  id: string;
  name: string;
  symbol: string;
}

export interface IProductUnitConversion {
  id: string;
  productId: string;
  presentationUnitId: string;
  conversionFactor: number; // e.g. 1 Box = 100 units -> conversionFactor = 100
  presentationUnit?: IUnit;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IProduct {
  id: string;
  internalCode: string;
  name: string;
  description?: string | null;
  categoryId: string;
  baseUnitId: string;
  minStock: number;
  costNet: number;
  markupPercentage?: number | null;
  suggestedPriceNet: number;
  activePriceNet: number;
  taxTreatment: ProductTaxTreatment;
  ivaPercentage: number | null;
  status: ProductStatus;
  category?: ICategory;
  baseUnit?: IUnit;
  conversions?: IProductUnitConversion[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IProductSellerView {
  id: string;
  internalCode: string;
  name: string;
  description?: string | null;
  categoryId: string;
  baseUnitId: string;
  minStock: number;
  activePriceNet: number;
  taxTreatment: ProductTaxTreatment;
  ivaPercentage: number | null;
  status: ProductStatus;
  category?: ICategory;
  baseUnit?: IUnit;
  conversions?: IProductUnitConversion[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IProductSummary {
  id: string;
  internalCode: string;
  name: string;
  baseUnit: IUnitSummary;
  currentStock: number | null;
  activePriceNet: number;
  taxTreatment: ProductTaxTreatment;
  ivaPercentage: number | null;
}

export interface PaginatedProductsResponse<T = IProduct> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}
