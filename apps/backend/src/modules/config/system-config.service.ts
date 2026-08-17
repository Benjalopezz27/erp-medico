import { Injectable } from '@nestjs/common';

@Injectable()
export class SystemConfigService {
  getStatus(): { module: string; status: string } {
    return { module: 'system-config', status: 'initialized' };
  }
}
