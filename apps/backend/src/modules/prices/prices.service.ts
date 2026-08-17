import { Injectable } from '@nestjs/common';

@Injectable()
export class PricesService {
  getStatus(): { module: string; status: string } {
    return { module: 'prices', status: 'initialized' };
  }
}
