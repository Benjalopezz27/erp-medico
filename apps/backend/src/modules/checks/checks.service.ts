import { Injectable } from '@nestjs/common';

@Injectable()
export class ChecksService {
  getStatus(): { module: string; status: string } {
    return { module: 'checks', status: 'initialized' };
  }
}
