import {
  AccountReceivableStatus,
  AccountReceivableMovementType,
  DebtorStatus,
  PaymentMethod,
  PaymentAllocationType,
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
  paymentId?: string | null;
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
  amountAllocated: string;
  allocationType: PaymentAllocationType;
}

export interface IReceipt {
  id: string;
  receiptNumber: string;
  paymentId: string;
  customerId: string;
  totalAmount: string;
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
  totalAmount: string;
  paymentMethod: PaymentMethod;
  notes?: string | null;
  allocations?: IPaymentAllocation[];
  receipt?: IReceipt | null;
  userId: string;
  createdAt: Date | string;
}

/** Cobro con aplicación dirigida: el cliente indica el monto por factura. */
export interface IRegisterPaymentDirectedRequest {
  customerId: string;
  paymentMethod: PaymentMethod.EFECTIVO | PaymentMethod.TRANSFERENCIA;
  notes?: string;
  mode: PaymentAllocationType.DIRECTED;
  allocations: { accountReceivableId: string; amount: string }[];
}

/** Cobro por antigüedad: el servidor cancela desde la factura más vieja. */
export interface IRegisterPaymentByAgeRequest {
  customerId: string;
  paymentMethod: PaymentMethod.EFECTIVO | PaymentMethod.TRANSFERENCIA;
  notes?: string;
  mode: PaymentAllocationType.GLOBAL_AGE;
  totalAmount: string;
}

export type IRegisterPaymentRequest =
  | IRegisterPaymentDirectedRequest
  | IRegisterPaymentByAgeRequest;

export interface IReceiptAppliedInvoice {
  accountReceivableId: string;
  documentReference: string;
  invoiceDate: Date | string;
  originalAmount: string;
  amountApplied: string;
}

export interface IReceiptDetail {
  id: string;
  receiptNumber: string;
  paymentId: string;
  createdAt: Date | string;
  customerId: string;
  customerName: string;
  customerDocument: string;
  paymentMethod: PaymentMethod;
  notes: string | null;
  applied: IReceiptAppliedInvoice[];
  totalAmount: string;
}

export interface IRegisterPaymentResponse {
  payment: IPayment;
  receipt: IReceipt;
}
