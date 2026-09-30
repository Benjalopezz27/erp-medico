import { PickType } from '@nestjs/swagger';
import { CreateUserDto } from '../../users/dto/create-user.dto';

// Reuses CreateUserDto validators; `role`/`isActive` are omitted so whitelist strips them.
export class RegisterDto extends PickType(CreateUserDto, [
  'name',
  'email',
  'password',
] as const) {}
