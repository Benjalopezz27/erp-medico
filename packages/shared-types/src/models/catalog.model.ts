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
}

export interface IProductUnitConversion {
  id: string;
  productId: string;
  presentationUnitId: string;
  conversionFactorToBase: number; // e.g. 1 Box = 100 units -> 100
  createdAt: Date | string;
}

export interface IProduct {
  id: string;
  internalCode: string;
  name: string;
  description?: string | null;
  categoryId: string;
  baseUnitId: string;
  currentStock: number;
  minStockAlert: number;
  currentCostNet: number;
  markupPercentage?: number | null;
  activePriceNet: number;
  isActive: boolean;
  category?: ICategory;
  baseUnit?: IUnit;
  conversions?: IProductUnitConversion[];
  createdAt: Date | string;
  updatedAt: Date | string;
}
