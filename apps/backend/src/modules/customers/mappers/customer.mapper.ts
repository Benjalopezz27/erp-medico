import Decimal from 'decimal.js';
import { CustomerResponseDto } from '../dto/customer-response.dto';
import { Customer } from '../entities/customer.entity';

export function toCustomerResponseDto(customer: Customer): CustomerResponseDto {
  return {
    id: customer.id,
    businessName: customer.businessName,
    documentType: customer.documentType,
    cuitOrDni: customer.cuitOrDni,
    taxCondition: customer.taxCondition,
    email: customer.email ?? null,
    phone: customer.phone ?? null,
    address: customer.address ?? null,
    creditLimit: new Decimal(customer.creditLimit).toFixed(2),
    isActive: customer.isActive,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
}

export function toPublicCustomerSnapshot(
  customer: Customer,
): Record<string, unknown> {
  return toCustomerResponseDto(customer) as unknown as Record<string, unknown>;
}
