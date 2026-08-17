import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StockService } from './stock.service';

@ApiTags('stock')
@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get('status')
  @ApiOperation({ summary: 'Check Stock module status' })
  @ApiResponse({ status: 200, description: 'Stock module operational' })
  getStatus() {
    return this.stockService.getStatus();
  }
}
