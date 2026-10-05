import { PickType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

// Self-service edit: only the name, reusing CreateUserDto's validators.
export class UpdateMeDto extends PickType(CreateUserDto, ['name'] as const) {}
