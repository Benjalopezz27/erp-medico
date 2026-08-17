import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('status')
  @ApiOperation({ summary: 'Check Reports module status' })
  @ApiResponse({ status: 200, description: 'Reports module operational' })
  getStatus() {
    return this.reportsService.getStatus();
  }
}
