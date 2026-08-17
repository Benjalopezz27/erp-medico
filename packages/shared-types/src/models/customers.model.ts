import { TaxCondition } from '../enums/financial.enum';

export interface ICustomer {
  id: string;
  businessName: string;
  cuitOrDni: string;
  taxCondition: TaxCondition;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  creditLimit: number;
  currentBalance: number; // positive = owes us
  allowCreditSales: boolean;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ICustomerSpecialPrice {
  id: string;
  customerId: string;
  productId: string;
  specialPriceNet?: number | null;
  discountPercentage?: number | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}
