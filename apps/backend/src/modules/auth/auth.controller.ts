import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';

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
}
