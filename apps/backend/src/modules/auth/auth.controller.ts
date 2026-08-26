import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('status')
  @ApiOperation({ summary: 'Check Auth module status' })
  @ApiResponse({ status: 200, description: 'Auth module operational' })
  getStatus() {
    return this.authService.getStatus();
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
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
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or inactive user',
  })
  @ApiResponse({
    status: 429,
    description:
      'Too Many Requests (rate limit exceeded: max 5 requests per minute)',
  })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }
}
