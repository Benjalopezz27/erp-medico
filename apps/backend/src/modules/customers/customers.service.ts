import { Injectable } from '@nestjs/common';

@Injectable()
export class CustomersService {
  getStatus(): { module: string; status: string } {
    return { module: 'customers', status: 'initialized' };
  }
}
