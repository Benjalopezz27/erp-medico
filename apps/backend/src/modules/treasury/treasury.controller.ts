import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TreasuryService } from './treasury.service';

@ApiTags('treasury')
@Controller('treasury')
export class TreasuryController {
  constructor(private readonly treasuryService: TreasuryService) {}

  @Get('status')
  @ApiOperation({ summary: 'Check Treasury module status' })
  @ApiResponse({ status: 200, description: 'Treasury module operational' })
  getStatus() {
    return this.treasuryService.getStatus();
  }
}
