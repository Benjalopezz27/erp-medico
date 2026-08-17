import { Injectable } from '@nestjs/common';

@Injectable()
export class ReceivablesService {
  getStatus(): { module: string; status: string } {
    return { module: 'receivables', status: 'initialized' };
  }
}
