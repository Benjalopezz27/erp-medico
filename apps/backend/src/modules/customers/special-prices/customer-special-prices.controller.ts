import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@erp/shared-types';
import { CurrentUser, Roles } from '../../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../../auth/guards';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { CreateCustomerSpecialPriceDto } from './dto/create-customer-special-price.dto';
import {
  CustomerSpecialPriceResponseDto,
  PaginatedCustomerSpecialPricesResponseDto,
} from './dto/customer-special-price-response.dto';
import { QueryCustomerSpecialPricesDto } from './dto/query-customer-special-prices.dto';
import { ResolvedCustomerPriceResponseDto } from './dto/resolved-customer-price-response.dto';
import { UpdateCustomerSpecialPriceDto } from './dto/update-customer-special-price.dto';
import { CustomerPricingService } from './services/customer-pricing.service';

@ApiTags('customer-pricing')
@ApiBearerAuth('JWT-auth')
@Controller('customers/:customerId/special-prices')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRADOR, UserRole.VENDEDOR)
@ApiResponse({ status: 401, description: 'No autenticado' })
@ApiResponse({ status: 403, description: 'Operación no autorizada' })
@ApiResponse({ status: 400, description: 'Modalidad o decimal inválido' })
@ApiResponse({
  status: 404,
  description: 'Cliente, producto o condición inexistente',
})
@ApiResponse({
  status: 409,
  description: 'Referencia inactiva, duplicado o conflicto concurrente',
})
export class CustomerSpecialPricesController {
  constructor(private readonly pricingService: CustomerPricingService) {}

  @Get()
  @ApiOperation({ summary: 'Listar condiciones especiales del cliente' })
  @ApiResponse({ status: 200, type: PaginatedCustomerSpecialPricesResponseDto })
  findAll(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query() query: QueryCustomerSpecialPricesDto,
  ): Promise<PaginatedCustomerSpecialPricesResponseDto> {
    return this.pricingService.findAllByCustomer(customerId, query);
  }

  @Get('resolve/:productId')
  @ApiOperation({
    summary: 'Resolver el precio final explicable de un producto',
  })
  @ApiResponse({ status: 200, type: ResolvedCustomerPriceResponseDto })
  resolve(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
  ): Promise<ResolvedCustomerPriceResponseDto> {
    return this.pricingService.getFinalPrice(customerId, productId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar una condición especial' })
  @ApiResponse({ status: 200, type: CustomerSpecialPriceResponseDto })
  findOne(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CustomerSpecialPriceResponseDto> {
    return this.pricingService.findOne(customerId, id);
  }

  @Post()
  @Roles(UserRole.ADMINISTRADOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear una condición especial' })
  @ApiResponse({ status: 201, type: CustomerSpecialPriceResponseDto })
  create(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() dto: CreateCustomerSpecialPriceDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<CustomerSpecialPriceResponseDto> {
    return this.pricingService.createSpecialPrice(customerId, dto, actor);
  }

  @Patch(':id')
  @Roles(UserRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Actualizar una condición especial' })
  @ApiResponse({ status: 200, type: CustomerSpecialPriceResponseDto })
  update(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerSpecialPriceDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<CustomerSpecialPriceResponseDto> {
    return this.pricingService.updateSpecialPrice(customerId, id, dto, actor);
  }

  @Delete(':id')
  @Roles(UserRole.ADMINISTRADOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una condición especial' })
  @ApiResponse({ status: 204, description: 'Condición eliminada' })
  async remove(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    await this.pricingService.deleteSpecialPrice(customerId, id, actor);
  }
}
