import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ReceivablesService } from './receivables.service';

@ApiTags('receivables')
@Controller('receivables')
export class ReceivablesController {
  constructor(private readonly receivablesService: ReceivablesService) {}

  @Get('status')
  @ApiOperation({ summary: 'Check Receivables module status' })
  @ApiResponse({ status: 200, description: 'Receivables module operational' })
  getStatus() {
    return this.receivablesService.getStatus();
  }
}
