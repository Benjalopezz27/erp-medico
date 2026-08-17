import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';

@ApiTags('suppliers')
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get('status')
  @ApiOperation({ summary: 'Check Suppliers module status' })
  @ApiResponse({ status: 200, description: 'Suppliers module operational' })
  getStatus() {
    return this.suppliersService.getStatus();
  }
}
