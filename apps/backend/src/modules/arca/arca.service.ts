import { Injectable } from '@nestjs/common';

@Injectable()
export class ArcaService {
  getStatus(): { module: string; status: string } {
    return { module: 'arca', status: 'initialized' };
  }
}
