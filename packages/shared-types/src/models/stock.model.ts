import { StockMovementType, QuarantineStatus } from '../enums/stock.enum';

export interface IStock {
  id: string;
  productId: string;
  currentBaseStock: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IStockMovement {
  id: string;
  productId: string;
  movementType: StockMovementType;
  quantityBase: number;
  previousStock: number;
  subsequentStock: number;
  reason: string;
  documentReference?: string | null;
  userId: string;
  createdAt: Date | string;
}

export interface IQuarantineStock {
  id: string;
  productId: string;
  quantity: number;
  reason: string;
  status: QuarantineStatus;
  resolutionNotes?: string | null;
  resolvedAt?: Date | string | null;
  userId: string;
  createdAt: Date | string;
}
