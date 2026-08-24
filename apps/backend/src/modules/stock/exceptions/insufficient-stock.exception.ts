import { UnprocessableEntityException } from '@nestjs/common';

export interface InsufficientStockDetails {
  productId: string;
  available: number;
  requested: number;
}

export class InsufficientStockException extends UnprocessableEntityException {
  constructor(details: InsufficientStockDetails) {
    super({
      statusCode: 422,
      error: 'Unprocessable Entity',
      code: 'INSUFFICIENT_STOCK',
      message: 'Stock insuficiente para completar la operación.',
      details: {
        productId: details.productId,
        available: details.available,
        requested: details.requested,
      },
    });
  }
}
