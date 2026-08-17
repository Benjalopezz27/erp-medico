import { Injectable } from '@nestjs/common';

@Injectable()
export class CostsService {
  getStatus(): { module: string; status: string } {
    return { module: 'costs', status: 'initialized' };
  }
}
