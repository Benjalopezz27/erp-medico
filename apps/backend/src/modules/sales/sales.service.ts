import { Injectable } from '@nestjs/common';

@Injectable()
export class SalesService {
  getStatus(): { module: string; status: string } {
    return { module: 'sales', status: 'initialized' };
  }
}
