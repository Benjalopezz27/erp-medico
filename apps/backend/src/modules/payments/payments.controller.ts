import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('status')
  @ApiOperation({ summary: 'Check Payments module status' })
  @ApiResponse({ status: 200, description: 'Payments module operational' })
  getStatus() {
    return this.paymentsService.getStatus();
  }
}
