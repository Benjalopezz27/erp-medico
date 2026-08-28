import { TaxCondition } from '../enums/financial.enum';
import { CustomerDocumentType } from '../enums/customers.enum';

export interface ICustomer {
  id: string;
  businessName: string;
  documentType: CustomerDocumentType;
  cuitOrDni: string;
  taxCondition: TaxCondition;
  email: string | null;
  phone: string | null;
  address: string | null;
  creditLimit: string;
  generalDiscountPercentage: string;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IPaginatedCustomersResponse {
  data: ICustomer[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
