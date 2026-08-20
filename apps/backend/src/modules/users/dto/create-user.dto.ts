import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@erp/shared-types';

export class CreateUserDto {
  @ApiProperty({
    description: 'Full name of the user',
    example: 'Carlos Gomez',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  name!: string;

  @ApiProperty({
    description: 'Unique email address',
    example: 'carlos.gomez@erp.com',
    maxLength: 255,
  })
  @IsEmail()
  @MaxLength(255)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  email!: string;

  @ApiProperty({
    description:
      'Initial password (min 8, max 128 chars, requires uppercase, lowercase, and number/symbol)',
    example: 'SecurePassword123!',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number or special character',
  })
  password!: string;

  @ApiPropertyOptional({
    description: 'Assigned system role',
    enum: UserRole,
    default: UserRole.VENDEDOR,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
