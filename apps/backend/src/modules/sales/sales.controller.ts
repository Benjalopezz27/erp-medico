import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SalesService } from './sales.service';

@ApiTags('sales')
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get('status')
  @ApiOperation({ summary: 'Check Sales module status' })
  @ApiResponse({ status: 200, description: 'Sales module operational' })
  getStatus() {
    return this.salesService.getStatus();
  }
}
