import {
  AccountReceivableStatus,
  AccountReceivableMovementType,
  DebtorStatus,
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
  amount: string;
  previousBalance: string;
  subsequentBalance: string;
  fiscalDocumentId?: string | null;
  saleReturnId?: string | null;
  userId: string;
  createdAt: Date | string;
}

export interface IReceivablesPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Saldo pendiente por tramo de antigüedad (días desde la creación de la factura). */
export interface IReceivableAging {
  days0to30: string;
  days31to60: string;
  days61plus: string;
}

export interface ICustomerAccountSummary {
  customerId: string;
  customerName: string;
  customerDocument: string;
  totalBalance: string;
  pendingCount: number;
  partialCount: number;
  creditLimit: string;
  exceedsCreditLimit: boolean;
  aging: IReceivableAging;
}

export interface ICustomerLedgerEntry {
  id: string;
  createdAt: Date | string;
  movementType: AccountReceivableMovementType;
  documentReference: string;
  /** Importe con signo: FACTURA y REVERSION_CHEQUE suman, el resto resta. */
  signedAmount: string;
  runningBalance: string;
}

export interface ICustomerAccountResponse {
  summary: ICustomerAccountSummary;
  pendingInvoices: IAccountReceivable[];
  ledger: {
    data: ICustomerLedgerEntry[];
    meta: IReceivablesPaginationMeta;
  };
}

export interface IReceivableDebtorRow {
  customerId: string;
  customerName: string;
  customerDocument: string | null;
  pendingCount: number;
  totalBalance: string;
  oldestDebtDate: Date | string;
  aging: IReceivableAging;
  status: DebtorStatus;
}

export interface IReceivableDebtorsResponse {
  data: IReceivableDebtorRow[];
  meta: IReceivablesPaginationMeta;
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
