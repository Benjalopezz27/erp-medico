import { Injectable } from '@nestjs/common';

@Injectable()
export class ImporterService {
  getStatus(): { module: string; status: string } {
    return { module: 'importer', status: 'initialized' };
  }
}
