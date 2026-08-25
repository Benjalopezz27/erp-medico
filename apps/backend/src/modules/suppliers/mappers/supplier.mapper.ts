import { Supplier } from '../entities/supplier.entity';
import { SupplierResponseDto } from '../dto/supplier-response.dto';

export function toSupplierResponseDto(supplier: Supplier): SupplierResponseDto {
  return {
    id: supplier.id,
    businessName: supplier.businessName,
    cuit: supplier.cuit,
    taxCondition: supplier.taxCondition,
    email: supplier.email ?? null,
    phone: supplier.phone ?? null,
    whatsapp: supplier.whatsapp ?? null,
    address: supplier.address ?? null,
    isActive: supplier.isActive,
    createdAt: supplier.createdAt,
    updatedAt: supplier.updatedAt,
  };
}

export function toPublicSupplierSnapshot(
  supplier: Supplier,
): Record<string, unknown> {
  return {
    id: supplier.id,
    businessName: supplier.businessName,
    cuit: supplier.cuit,
    taxCondition: supplier.taxCondition,
    email: supplier.email ?? null,
    phone: supplier.phone ?? null,
    whatsapp: supplier.whatsapp ?? null,
    address: supplier.address ?? null,
    isActive: supplier.isActive,
  };
}
