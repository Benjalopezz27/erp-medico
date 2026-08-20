import { ApiProperty } from '@nestjs/swagger';
import { UserRole, IUser } from '@erp/shared-types';

export class UserResponseDto implements IUser {
  @ApiProperty({ description: 'User UUID identifier' })
  id!: string;

  @ApiProperty({ description: 'Full name' })
  name!: string;

  @ApiProperty({ description: 'Email address' })
  email!: string;

  @ApiProperty({ description: 'Assigned system role', enum: UserRole })
  role!: UserRole;

  @ApiProperty({ description: 'Account status (active/inactive)' })
  isActive!: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date | string;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: Date | string;
}
