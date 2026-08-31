import {
  AccountReceivableStatus,
  AccountReceivableMovementType,
  PaymentMethod,
  CheckStatus,
} from '../enums/financial.enum';

export interface IAccountReceivable {
  id: string;
  customerId: string;
  saleId?: string | null;
  fiscalDocumentId?: string | null;
  documentReference: string;
  originalAmount: string;
  currentBalance: string;
  status: AccountReceivableStatus;
  dueDate?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IAccountReceivableMovement {
  id: string;
  accountReceivableId: string;
  movementType: AccountReceivableMovementType;
  amount: number;
  previousBalance: number;
  subsequentBalance: number;
  receiptId?: string | null;
  userId: string;
  createdAt: Date | string;
}

export interface IPaymentAllocation {
  id: string;
  paymentId: string;
  accountReceivableId: string;
  amountAllocated: number;
}

export interface IReceipt {
  id: string;
  receiptNumber: string;
  customerId: string;
  totalAmount: number;
  notes?: string | null;
  userId: string;
  createdAt: Date | string;
}

export interface ICheck {
  id: string;
  bankName: string;
  checkNumber: string;
  amount: number;
  issueDate: Date | string;
  paymentDate: Date | string; // Fecha de cobro / vencimiento
  issuerCuit: string;
  issuerName: string;
  customerId: string;
  status: CheckStatus;
  receivedPaymentId?: string | null;
  rejectionReason?: string | null;
  rejectedAt?: Date | string | null;
  depositedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IPayment {
  id: string;
  customerId: string;
  receiptId?: string | null;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  checkId?: string | null;
  allocations?: IPaymentAllocation[];
  receipt?: IReceipt | null;
  check?: ICheck | null;
  userId: string;
  createdAt: Date | string;
}
