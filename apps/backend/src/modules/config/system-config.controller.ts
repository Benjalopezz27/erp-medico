import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SystemConfigService } from './system-config.service';

@ApiTags('system-config')
@Controller('config')
export class SystemConfigController {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  @Get('status')
  @ApiOperation({ summary: 'Check System Config module status' })
  @ApiResponse({ status: 200, description: 'System Config module operational' })
  getStatus() {
    return this.systemConfigService.getStatus();
  }
}
