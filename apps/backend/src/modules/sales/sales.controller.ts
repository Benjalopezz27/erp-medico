import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
import { CurrentUser, Roles } from '../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  CreateSaleDto,
  PaginatedSalesResponseDto,
  QuerySalesDto,
  SaleResponseDto,
} from './dto';
import { SalesService } from './sales.service';

@ApiTags('sales')
@ApiBearerAuth('JWT-auth')
@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRADOR, UserRole.VENDEDOR)
@ApiResponse({ status: 401, description: 'No autenticado' })
@ApiResponse({ status: 403, description: 'Operación no autorizada' })
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Confirmar una venta atómica' })
  @ApiResponse({ status: 201, type: SaleResponseDto })
  @ApiResponse({ status: 400, description: 'Contrato comercial inválido' })
  @ApiResponse({ status: 404, description: 'Cliente o producto inexistente' })
  @ApiResponse({
    status: 409,
    description: 'Referencia inactiva o conflicto concurrente',
  })
  @ApiResponse({ status: 422, description: 'Stock insuficiente' })
  create(
    @Body() dto: CreateSaleDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SaleResponseDto> {
    return this.salesService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Listar ventas con filtros y paginación' })
  @ApiResponse({ status: 200, type: PaginatedSalesResponseDto })
  findAll(@Query() query: QuerySalesDto): Promise<PaginatedSalesResponseDto> {
    return this.salesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar el detalle completo de una venta' })
  @ApiResponse({ status: 200, type: SaleResponseDto })
  @ApiResponse({ status: 404, description: 'Venta inexistente' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<SaleResponseDto> {
    return this.salesService.findOne(id);
  }
}
