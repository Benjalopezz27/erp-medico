import { Injectable } from '@nestjs/common';

@Injectable()
export class PurchasesService {
  getStatus(): { module: string; status: string } {
    return { module: 'purchases', status: 'initialized' };
  }
}
