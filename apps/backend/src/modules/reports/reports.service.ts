import { Injectable } from '@nestjs/common';

@Injectable()
export class ReportsService {
  getStatus(): { module: string; status: string } {
    return { module: 'reports', status: 'initialized' };
  }
}
