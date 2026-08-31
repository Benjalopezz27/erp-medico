import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@erp/shared-types';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { CreateSaleReturnDto, SaleReturnResponseDto } from './dto';
import { SaleReturnsService } from './services/sale-returns.service';

@ApiTags('Sales Returns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sales')
export class SaleReturnsController {
  constructor(private readonly saleReturnsService: SaleReturnsService) {}

  @Post(':id/returns')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMINISTRADOR, UserRole.VENDEDOR)
  @ApiOperation({
    summary: 'Registrar una devolución sobre una venta confirmada',
    description:
      'Registra la devolución parcial o total de ítems de una venta confirmada con control de calidad (APTO / NO_APTO).',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: SaleReturnResponseDto,
    description: 'Devolución registrada exitosamente.',
  })
  createReturn(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateSaleReturnDto,
    @CurrentUser('id') userId: string,
  ): Promise<SaleReturnResponseDto> {
    return this.saleReturnsService.createReturn(id, dto, userId);
  }

  @Get(':id/returns')
  @Roles(UserRole.ADMINISTRADOR, UserRole.VENDEDOR)
  @ApiOperation({
    summary: 'Consultar el historial de devoluciones de una venta',
    description:
      'Devuelve la lista de devoluciones registradas para la venta indicada.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: [SaleReturnResponseDto],
    description: 'Historial de devoluciones de la venta.',
  })
  findReturnsBySaleId(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SaleReturnResponseDto[]> {
    return this.saleReturnsService.findReturnsBySaleId(id);
  }
}
