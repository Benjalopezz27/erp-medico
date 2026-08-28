import type {
  CustomerDocumentType,
  CustomerSortField,
  ICustomer,
  IPaginatedCustomersResponse,
  TaxCondition,
} from '@erp/shared-types';

export type {
  CustomerDocumentType,
  CustomerSortField,
  ICustomer,
  IPaginatedCustomersResponse,
  TaxCondition,
};

export interface CustomerSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  taxCondition?: TaxCondition;
  isActive?: boolean;
  sortBy?: CustomerSortField;
  sortOrder?: 'ASC' | 'DESC';
}

export interface CreateCustomerPayload {
  businessName: string;
  documentType: CustomerDocumentType;
  cuitOrDni: string;
  taxCondition: TaxCondition;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  creditLimit?: string;
}

export type UpdateCustomerPayload = Partial<CreateCustomerPayload>;
