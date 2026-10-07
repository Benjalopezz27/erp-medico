import {
  AccountReceivableStatus,
  AccountReceivableMovementType,
  DebtorStatus,
  PaymentMethod,
  PaymentAllocationType,
  CheckStatus,
  PaymentStatus,
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
  paymentId: string;
  customerId: string;
  bankName: string;
  checkNumber: string;
  drawerName: string;
  amount: string;
  issueDate?: string | null;
  dueDate: string;
  receivedDate: string;
  status: CheckStatus;
  endorsedToSupplierId?: string | null;
  rejectedAt?: Date | string | null;
  rejectionReason?: string | null;
  updatedAt: Date | string;
}

/** Datos del cheque recibido en un cobro. El monto es el total del cobro. */
export interface ICheckInput {
  bankName: string;
  checkNumber: string;
  drawerName: string;
  dueDate: string;
  issueDate?: string;
}

export interface ICheckListItem extends ICheck {
  customerName: string;
}

export interface ICheckListResponse {
  data: ICheckListItem[];
  meta: IReceivablesPaginationMeta;
  /** Cheques RECIBIDO/EN_CARTERA que vencen en los próximos 7 días. */
  dueSoonCount: number;
}

export interface ICheckRejectionImpactLine {
  accountReceivableId: string;
  documentReference: string;
  amountToRestore: string;
  resultingBalance: string;
  resultingStatus: AccountReceivableStatus;
}

export interface ICheckRejectionImpact {
  lines: ICheckRejectionImpactLine[];
  totalIncrease: string;
}

export interface ICheckDetail extends ICheckListItem {
  /** Solo para cheques EN_CARTERA o DEPOSITADO. */
  rejectionImpact: ICheckRejectionImpact | null;
  /** Si el rechazo hoy fallaría (ledger inconsistente), el motivo. */
  rejectionBlockedReason: string | null;
}

export interface IPayment {
  id: string;
  customerId: string;
  totalAmount: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  notes?: string | null;
  allocations?: IPaymentAllocation[];
  receipt?: IReceipt | null;
  userId: string;
  createdAt: Date | string;
}

/** Cobro con aplicación dirigida: el cliente indica el monto por factura. */
export interface IRegisterPaymentDirectedRequest {
  customerId: string;
  paymentMethod: PaymentMethod.EFECTIVO | PaymentMethod.TRANSFERENCIA | PaymentMethod.CHEQUE;
  /** Obligatorio si y solo si el medio es CHEQUE. */
  check?: ICheckInput;
  notes?: string;
  mode: PaymentAllocationType.DIRECTED;
  idempotencyKey?: string;
  allocations: { accountReceivableId: string; amount: string }[];
}

/** Cobro por antigüedad: el servidor cancela desde la factura más vieja. */
export interface IRegisterPaymentByAgeRequest {
  customerId: string;
  paymentMethod: PaymentMethod.EFECTIVO | PaymentMethod.TRANSFERENCIA | PaymentMethod.CHEQUE;
  /** Obligatorio si y solo si el medio es CHEQUE. */
  check?: ICheckInput;
  notes?: string;
  mode: PaymentAllocationType.GLOBAL_AGE;
  idempotencyKey?: string;
  totalAmount: string;
}

export type IRegisterPaymentRequest =
  IRegisterPaymentDirectedRequest | IRegisterPaymentByAgeRequest;

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
  paymentStatus: PaymentStatus;
  check: { bankName: string; checkNumber: string } | null;
  notes: string | null;
  applied: IReceiptAppliedInvoice[];
  totalAmount: string;
}

export interface IRegisterPaymentResponse {
  payment: IPayment;
  receipt: IReceipt;
}
