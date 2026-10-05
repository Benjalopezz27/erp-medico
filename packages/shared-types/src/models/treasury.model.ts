import { TreasuryAccountType } from '../enums/financial.enum';
import { IReceivablesPaginationMeta } from './receivables.model';

export enum TreasuryMovementType {
  INGRESO = 'INGRESO',
  EGRESO = 'EGRESO',
}

/** Cuentas en las que se admite un movimiento manual (cartera solo se mueve por cheques). */
export type ManualTreasuryAccountType = TreasuryAccountType.EFECTIVO | TreasuryAccountType.BANCOS;

export interface ITreasuryAccountBalance {
  accountType: TreasuryAccountType;
  name: string;
  /** Decimal con 2 decimales: ingresos menos egresos. */
  balance: string;
}

export interface ITreasurySummary {
  accounts: ITreasuryAccountBalance[];
}

export interface ITreasuryMovement {
  id: string;
  accountType: TreasuryAccountType;
  movementType: TreasuryMovementType;
  amount: string;
  concept: string;
  referenceType: string | null;
  referenceId: string | null;
  user: { id: string; name: string } | null;
  createdAt: string;
}

export interface ITreasuryMovementListResponse {
  data: ITreasuryMovement[];
  meta: IReceivablesPaginationMeta;
}

export interface ICreateTreasuryMovementPayload {
  accountType: ManualTreasuryAccountType;
  movementType: TreasuryMovementType;
  amount: string;
  concept: string;
}
