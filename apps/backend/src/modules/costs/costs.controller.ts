import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CostsService } from './costs.service';

@ApiTags('costs')
@Controller('costs')
export class CostsController {
  constructor(private readonly costsService: CostsService) {}

  @Get('status')
  @ApiOperation({ summary: 'Check Costs module status' })
  @ApiResponse({ status: 200, description: 'Costs module operational' })
  getStatus() {
    return this.costsService.getStatus();
  }
}
