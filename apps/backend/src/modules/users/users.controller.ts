import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('status')
  @ApiOperation({ summary: 'Check Users module status' })
  @ApiResponse({ status: 200, description: 'Users module operational' })
  getStatus() {
    return this.usersService.getStatus();
  }
}
