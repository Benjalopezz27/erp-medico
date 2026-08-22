import {
  ProductStatus,
  type IProduct,
  type IProductSellerView,
  type IProductUnitConversion,
  type ICategory,
  type IUnit,
} from '@erp/shared-types';

export { ProductStatus };
export type { IProduct, IProductSellerView, IProductUnitConversion, ICategory, IUnit };

export type ProductListItem = IProduct | IProductSellerView;

export function isProductAdminView(product: ProductListItem): product is IProduct {
  return 'costNet' in product;
}

export type ProductNoticeType = 'created' | 'updated' | 'deactivated' | 'reactivated';

export interface ProductSearchParams {
  page: number;
  limit: number;
  status?: ProductStatus;
  notice?: ProductNoticeType;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedProductsResponse<T = ProductListItem> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}

export interface ProductConversionRow {
  id?: string; // Present if already saved in backend
  presentationUnitId: string;
  conversionFactor: number;
}

export interface ProductFormValues {
  internalCode: string;
  name: string;
  description?: string | null;
  categoryId: string;
  baseUnitId: string;
  minStock: number;
  costNet: number;
  markupPercentage?: number | null;
  activePriceNet: number;
  conversions: ProductConversionRow[];
}

export interface CreateProductPayload {
  internalCode: string;
  name: string;
  description?: string | null;
  categoryId: string;
  baseUnitId: string;
  minStock?: number;
  costNet: number;
  markupPercentage?: number | null;
  activePriceNet: number;
  conversions?: Array<{
    presentationUnitId: string;
    conversionFactor: number;
  }>;
}

export interface UpdateProductPayload {
  name?: string;
  description?: string | null;
  categoryId?: string;
  baseUnitId?: string;
  minStock?: number;
  costNet?: number;
  markupPercentage?: number | null;
  activePriceNet?: number;
  status?: ProductStatus;
}
