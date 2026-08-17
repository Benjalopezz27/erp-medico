import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  getStatus(): { module: string; status: string } {
    return { module: 'users', status: 'initialized' };
  }
}
