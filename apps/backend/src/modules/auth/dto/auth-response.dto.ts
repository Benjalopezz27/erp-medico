import { ApiProperty } from '@nestjs/swagger';
import { IAuthSession, IAuthUser, UserRole } from '@erp/shared-types';

export class AuthUserDto implements IAuthUser {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  id!: string;

  @ApiProperty({ example: 'Juan Admin' })
  name!: string;

  @ApiProperty({ example: 'admin@erp.com' })
  email!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.ADMINISTRADOR })
  role!: UserRole;

  @ApiProperty({ example: true })
  isActive!: boolean;
}

export class AuthResponseDto implements IAuthSession {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT Access Token for Authorization header',
  })
  accessToken!: string;

  @ApiProperty({ type: () => AuthUserDto })
  user!: AuthUserDto;
}
