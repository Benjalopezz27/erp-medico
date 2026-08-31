import { UserRole } from '@erp/shared-types';
import Decimal from 'decimal.js';
import { Product } from '../entities/product.entity';
import { ProductUnitConversion } from '../entities/product-unit-conversion.entity';
import { ProductAdminResponseDto } from '../dto/product-admin-response.dto';
import { ProductSellerResponseDto } from '../dto/product-seller-response.dto';
import { ProductSummaryResponseDto } from '../dto/product-summary-response.dto';
import { ProductUnitConversionResponseDto } from '../dto/product-unit-conversion-response.dto';
import { toCategoryResponseDto } from '../../categories/mappers/category.mapper';
import { toUnitResponseDto } from '../../units/mappers/unit.mapper';

export class ProductMapper {
  private static parseDecimal(
    val: string | number | null | undefined,
    scale: number,
  ): number {
    if (val === null || val === undefined || val === '') {
      return 0;
    }
    return new Decimal(val)
      .toDecimalPlaces(scale, Decimal.ROUND_HALF_UP)
      .toNumber();
  }

  private static parseNullableDecimal(
    val: string | number | null | undefined,
    scale: number,
  ): number | null {
    if (val === null || val === undefined || val === '') {
      return null;
    }
    return new Decimal(val)
      .toDecimalPlaces(scale, Decimal.ROUND_HALF_UP)
      .toNumber();
  }

  public static toConversionResponse(
    conversion: ProductUnitConversion,
  ): ProductUnitConversionResponseDto {
    return {
      id: conversion.id,
      productId: conversion.productId,
      presentationUnitId: conversion.presentationUnitId,
      conversionFactor: this.parseDecimal(conversion.conversionFactor, 4),
      presentationUnit: conversion.presentationUnit
        ? toUnitResponseDto(conversion.presentationUnit)
        : undefined,
      createdAt: conversion.createdAt,
      updatedAt: conversion.updatedAt,
    };
  }

  public static toAdminResponse(product: Product): ProductAdminResponseDto {
    return {
      id: product.id,
      internalCode: product.internalCode,
      name: product.name,
      description: product.description || null,
      categoryId: product.categoryId,
      baseUnitId: product.baseUnitId,
      minStock: this.parseDecimal(product.minStock, 2),
      costNet: this.parseDecimal(product.costNet, 4),
      markupPercentage: this.parseNullableDecimal(product.markupPercentage, 4),
      suggestedPriceNet: this.parseDecimal(product.suggestedPriceNet, 2),
      activePriceNet: this.parseDecimal(product.activePriceNet, 2),
      taxTreatment: product.taxTreatment,
      ivaPercentage: this.parseNullableDecimal(product.ivaPercentage, 2),
      status: product.status,
      category: product.category
        ? toCategoryResponseDto(product.category)
        : undefined,
      baseUnit: product.baseUnit
        ? toUnitResponseDto(product.baseUnit)
        : undefined,
      conversions: product.conversions
        ? product.conversions.map((c) => this.toConversionResponse(c))
        : [],
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  public static toSellerResponse(product: Product): ProductSellerResponseDto {
    return {
      id: product.id,
      internalCode: product.internalCode,
      name: product.name,
      description: product.description || null,
      categoryId: product.categoryId,
      baseUnitId: product.baseUnitId,
      minStock: this.parseDecimal(product.minStock, 2),
      activePriceNet: this.parseDecimal(product.activePriceNet, 2),
      taxTreatment: product.taxTreatment,
      ivaPercentage: this.parseNullableDecimal(product.ivaPercentage, 2),
      status: product.status,
      category: product.category
        ? toCategoryResponseDto(product.category)
        : undefined,
      baseUnit: product.baseUnit
        ? toUnitResponseDto(product.baseUnit)
        : undefined,
      conversions: product.conversions
        ? product.conversions.map((c) => this.toConversionResponse(c))
        : [],
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  public static toSummaryResponse(product: Product): ProductSummaryResponseDto {
    return {
      id: product.id,
      internalCode: product.internalCode,
      name: product.name,
      baseUnit: {
        id: product.baseUnit?.id || product.baseUnitId,
        name: product.baseUnit?.name || '',
        symbol: product.baseUnit?.symbol || '',
      },
      currentStock: product.stock
        ? this.parseDecimal(product.stock.currentBaseStock, 2)
        : 0,
      activePriceNet: this.parseDecimal(product.activePriceNet, 2),
      taxTreatment: product.taxTreatment,
      ivaPercentage: this.parseNullableDecimal(product.ivaPercentage, 2),
    };
  }

  public static toResponse(
    product: Product,
    role?: UserRole | null,
  ): ProductAdminResponseDto | ProductSellerResponseDto {
    if (role === UserRole.ADMINISTRADOR) {
      return this.toAdminResponse(product);
    }
    return this.toSellerResponse(product);
  }
}
