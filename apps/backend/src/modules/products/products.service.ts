import { Injectable } from '@nestjs/common';

@Injectable()
export class ProductsService {
  getStatus(): { module: string; status: string } {
    return { module: 'products', status: 'initialized' };
  }
}
