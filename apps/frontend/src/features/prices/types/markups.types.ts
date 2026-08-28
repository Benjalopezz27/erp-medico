import type { IMarkupConfiguration, IMarkupSimulation, MarkupLevel } from '@erp/shared-types';

export type { IMarkupConfiguration, IMarkupSimulation };

export interface CreateMarkupPayload {
  level: MarkupLevel;
  percentage: string;
  categoryId?: string;
  productId?: string;
}

export interface UpdateMarkupPayload {
  percentage: string;
}

export interface MarkupValidationResult {
  success: boolean;
  value?: string;
  message?: string;
}
