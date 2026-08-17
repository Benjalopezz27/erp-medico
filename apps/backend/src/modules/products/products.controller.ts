import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProductsService } from './products.service';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('status')
  @ApiOperation({ summary: 'Check Products module status' })
  @ApiResponse({ status: 200, description: 'Products module operational' })
  getStatus() {
    return this.productsService.getStatus();
  }
}
