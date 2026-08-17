import { Injectable } from '@nestjs/common';

@Injectable()
export class SuppliersService {
  getStatus(): { module: string; status: string } {
    return { module: 'suppliers', status: 'initialized' };
  }
}
