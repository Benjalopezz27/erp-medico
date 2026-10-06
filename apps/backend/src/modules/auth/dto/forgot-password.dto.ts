import { ApiProperty, PickType } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { LoginDto } from './login.dto';

const PASSWORD_REGEX = /((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/;
const PASSWORD_MESSAGE =
  'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number or special character';

export class ForgotPasswordDto extends PickType(LoginDto, ['email'] as const) {}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Single-use token received by email' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  token!: string;

  @ApiProperty({ format: 'password', writeOnly: true })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  newPassword!: string;
}
