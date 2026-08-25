import Decimal from 'decimal.js';
import { SupplierProduct } from '../entities/supplier-product.entity';
import { SupplierProductResponseDto } from '../dto/supplier-product-response.dto';

export function toSupplierProductResponseDto(
  entity: SupplierProduct,
): SupplierProductResponseDto {
  return {
    id: entity.id,
    supplierId: entity.supplierId,
    productId: entity.productId,
    supplierExternalCode: entity.supplierExternalCode,
    supplierDescription: entity.supplierDescription ?? null,
    purchaseUnitId: entity.purchaseUnitId,
    conversionFactorToBase: Number(entity.conversionFactorToBase),
    usualCostNet:
      entity.usualCostNet !== null && entity.usualCostNet !== undefined
        ? Number(entity.usualCostNet)
        : null,
    isPrimarySupplier: entity.isPrimarySupplier,
    product: entity.product
      ? {
          id: entity.product.id,
          internalCode: entity.product.internalCode,
          name: entity.product.name,
          baseUnit: entity.product.baseUnit
            ? {
                id: entity.product.baseUnit.id,
                name: entity.product.baseUnit.name,
                symbol: entity.product.baseUnit.symbol,
              }
            : {
                id: entity.product.baseUnitId,
                name: '',
                symbol: '',
              },
        }
      : undefined,
    purchaseUnit: entity.purchaseUnit
      ? {
          id: entity.purchaseUnit.id,
          name: entity.purchaseUnit.name,
          symbol: entity.purchaseUnit.symbol,
        }
      : undefined,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export function toPublicSupplierProductSnapshot(
  entity: SupplierProduct,
): Record<string, unknown> {
  return {
    id: entity.id,
    supplierId: entity.supplierId,
    productId: entity.productId,
    supplierExternalCode: entity.supplierExternalCode,
    supplierDescription: entity.supplierDescription ?? null,
    purchaseUnitId: entity.purchaseUnitId,
    conversionFactorToBase: new Decimal(entity.conversionFactorToBase).toFixed(
      4,
    ),
    usualCostNet:
      entity.usualCostNet === null || entity.usualCostNet === undefined
        ? null
        : new Decimal(entity.usualCostNet).toFixed(4),
    isPrimarySupplier: entity.isPrimarySupplier,
  };
}
