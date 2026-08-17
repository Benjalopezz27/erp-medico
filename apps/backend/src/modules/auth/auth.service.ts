import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  getStatus(): { module: string; status: string } {
    return { module: 'auth', status: 'initialized' };
  }
}
