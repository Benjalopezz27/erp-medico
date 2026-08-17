import { Injectable } from '@nestjs/common';

@Injectable()
export class PaymentsService {
  getStatus(): { module: string; status: string } {
    return { module: 'payments', status: 'initialized' };
  }
}
