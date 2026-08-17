import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ChecksService } from './checks.service';

@ApiTags('checks')
@Controller('checks')
export class ChecksController {
  constructor(private readonly checksService: ChecksService) {}

  @Get('status')
  @ApiOperation({ summary: 'Check Checks module status' })
  @ApiResponse({ status: 200, description: 'Checks module operational' })
  getStatus() {
    return this.checksService.getStatus();
  }
}
