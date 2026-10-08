import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CostsService } from './costs.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('costs')
@Controller('costs')
export class CostsController {
  constructor(private readonly costsService: CostsService) {}

  @Public()
  @Get('status')
  @ApiOperation({ summary: 'Check Costs module status' })
  @ApiResponse({ status: 200, description: 'Costs module operational' })
  getStatus() {
    return this.costsService.getStatus();
  }
}
