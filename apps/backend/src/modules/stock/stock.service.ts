import { Injectable } from '@nestjs/common';

@Injectable()
export class StockService {
  getStatus(): { module: string; status: string } {
    return { module: 'stock', status: 'initialized' };
  }
}
