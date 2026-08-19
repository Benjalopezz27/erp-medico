import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @ApiProperty({
    example: 'admin@erp.com',
    description: 'User registered email address',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  email!: string;

  @ApiProperty({
    format: 'password',
    writeOnly: true,
    example: 'AdminPassword123!',
    description: 'User plaintext password',
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  password!: string;
}
