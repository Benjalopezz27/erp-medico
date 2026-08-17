import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PurchasesService } from './purchases.service';

@ApiTags('purchases')
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Get('status')
  @ApiOperation({ summary: 'Check Purchases module status' })
  @ApiResponse({ status: 200, description: 'Purchases module operational' })
  getStatus() {
    return this.purchasesService.getStatus();
  }
}
