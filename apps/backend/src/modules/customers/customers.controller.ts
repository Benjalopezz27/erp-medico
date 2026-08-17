import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CustomersService } from './customers.service';

@ApiTags('customers')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get('status')
  @ApiOperation({ summary: 'Check Customers module status' })
  @ApiResponse({ status: 200, description: 'Customers module operational' })
  getStatus() {
    return this.customersService.getStatus();
  }
}
