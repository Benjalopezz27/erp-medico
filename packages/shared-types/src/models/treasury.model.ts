import { TreasuryAccountType, CashRegisterStatus } from '../enums/financial.enum';

export interface ITreasuryAccount {
  id: string;
  name: string;
  type: TreasuryAccountType;
  currentBalance: number;
  bankAccountNumber?: string | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ITreasuryMovement {
  id: string;
  treasuryAccountId: string;
  amount: number;
  movementType: 'INGRESO' | 'EGRESO' | 'TRANSFERENCIA';
  previousBalance: number;
  subsequentBalance: number;
  concept: string;
  referenceDocument?: string | null;
  userId: string;
  createdAt: Date | string;
}

export interface ICashRegister {
  id: string;
  openedAt: Date | string;
  closedAt?: Date | string | null;
  initialCash: number;
  expectedCash?: number | null;
  actualCash?: number | null;
  difference?: number | null;
  status: CashRegisterStatus;
  openedByUserId: string;
  closedByUserId?: string | null;
  notes?: string | null;
}
