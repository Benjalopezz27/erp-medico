import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PricesService } from './prices.service';

@ApiTags('prices')
@Controller('prices')
export class PricesController {
  constructor(private readonly pricesService: PricesService) {}

  @Get('status')
  @ApiOperation({ summary: 'Check Prices module status' })
  @ApiResponse({ status: 200, description: 'Prices module operational' })
  getStatus() {
    return this.pricesService.getStatus();
  }
}
