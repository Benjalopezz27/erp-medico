import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from './decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/forgot-password.dto';
import { PasswordRecoveryService } from './password-recovery.service';
import { EmailThrottlerGuard } from './guards/email-throttler.guard';

@ApiTags('auth')
@Public()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordRecovery: PasswordRecoveryService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Check Auth module status' })
  @ApiResponse({ status: 200, description: 'Auth module operational' })
  getStatus() {
    return this.authService.getStatus();
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(EmailThrottlerGuard) // also per target email: rotating IPs cannot brute-force one account
  @Throttle({
    default: {
      limit: Number(process.env.THROTTLE_LIMIT_LOGIN || 5),
      ttl: Number(process.env.THROTTLE_TTL_MS || 60000),
    },
  })
  @ApiOperation({ summary: 'Authenticate user and issue JWT access token' })
  @ApiResponse({
    status: 200,
    description: 'Authentication successful',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input payload (e.g. invalid email format)',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({
    status: 403,
    description: 'Valid credentials but account pending approval',
  })
  @ApiResponse({
    status: 429,
    description:
      'Too Many Requests (rate limit exceeded: max 5 requests per minute)',
  })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Post('register')
  @Throttle({
    default: {
      limit: Number(process.env.THROTTLE_LIMIT_LOGIN || 5),
      ttl: Number(process.env.THROTTLE_TTL_MS || 60000),
    },
  })
  @ApiOperation({
    summary: 'Self-register an account (inactive until admin approval)',
  })
  @ApiResponse({
    status: 201,
    description: 'Account created, pending approval',
  })
  @ApiResponse({ status: 400, description: 'Invalid input payload' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  @ApiResponse({ status: 429, description: 'Too Many Requests' })
  async register(@Body() dto: RegisterDto): Promise<{ message: string }> {
    return this.authService.register(dto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(EmailThrottlerGuard)
  @Throttle({
    default: {
      limit: Number(process.env.THROTTLE_LIMIT_LOGIN || 5),
      ttl: Number(process.env.THROTTLE_TTL_MS || 60000),
    },
  })
  @ApiOperation({
    summary: 'Request a password reset link (same response for any email)',
  })
  @ApiResponse({ status: 200, description: 'Generic confirmation message' })
  @ApiResponse({ status: 400, description: 'Invalid email format' })
  @ApiResponse({ status: 429, description: 'Too Many Requests' })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    return this.passwordRecovery.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      limit: Number(process.env.THROTTLE_LIMIT_LOGIN || 5),
      ttl: Number(process.env.THROTTLE_TTL_MS || 60000),
    },
  })
  @ApiOperation({ summary: 'Set a new password using a single-use token' })
  @ApiResponse({ status: 200, description: 'Password updated' })
  @ApiResponse({
    status: 400,
    description: 'Invalid payload or token invalid/expired/used',
  })
  @ApiResponse({ status: 429, description: 'Too Many Requests' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    return this.passwordRecovery.resetPassword(dto.token, dto.newPassword);
  }
}
