import { Injectable } from '@nestjs/common';

@Injectable()
export class TreasuryService {
  getStatus(): { module: string; status: string } {
    return { module: 'treasury', status: 'initialized' };
  }
}
