import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UserRole } from '@erp/shared-types';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { GoodsReceiptsService } from '../services/goods-receipts.service';
import { CreateGoodsReceiptDto } from '../dto/create-goods-receipt.dto';
import { QueryGoodsReceiptsDto } from '../dto/query-goods-receipts.dto';
import { CreateGoodsReceiptResponseDto } from '../dto/create-goods-receipt-response.dto';
import { PaginatedGoodsReceiptsResponseDto } from '../dto/paginated-goods-receipts-response.dto';

@ApiTags('Purchase Orders Receipts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRADOR)
@Controller('purchase-orders/:purchaseOrderId/receipts')
export class GoodsReceiptsController {
  constructor(private readonly goodsReceiptsService: GoodsReceiptsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Registrar recepción física total o parcial contra una orden de compra emitida',
    description:
      'Valida remito único por proveedor, calcula unidades base con redondeo acumulativo exacto, registra movimientos ENTRADA_COMPRA y actualiza el estado de la orden de compra.',
  })
  @ApiParam({
    name: 'purchaseOrderId',
    type: 'string',
    format: 'uuid',
    description: 'ID de la orden de compra emitida o parcial',
  })
  @ApiResponse({
    status: 201,
    description: 'Recepción registrada exitosamente',
    type: CreateGoodsReceiptResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Parámetros inválidos, remito inválido o cantidad no representable',
  })
  @ApiResponse({
    status: 404,
    description: 'Orden de compra o ítem no encontrado',
  })
  @ApiResponse({
    status: 409,
    description:
      'Estado incompatible, remito duplicado, sobre-recepción o conflicto concurrente',
  })
  async create(
    @Param('purchaseOrderId', new ParseUUIDPipe({ version: '4' }))
    purchaseOrderId: string,
    @Body() dto: CreateGoodsReceiptDto,
    @CurrentUser() user: User,
  ): Promise<CreateGoodsReceiptResponseDto> {
    return this.goodsReceiptsService.createGoodsReceipt(
      purchaseOrderId,
      dto,
      user.id,
    );
  }

  @Get()
  @ApiOperation({
    summary:
      'Consultar historial inmutable de recepciones de una orden de compra',
    description:
      'Devuelve el listado paginado de remitos y recepciones registradas para la orden de compra, accesible en cualquier estado.',
  })
  @ApiParam({
    name: 'purchaseOrderId',
    type: 'string',
    format: 'uuid',
    description: 'ID de la orden de compra',
  })
  @ApiResponse({
    status: 200,
    description: 'Historial de recepciones obtenido exitosamente',
    type: PaginatedGoodsReceiptsResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Orden de compra no encontrada',
  })
  async findAll(
    @Param('purchaseOrderId', new ParseUUIDPipe({ version: '4' }))
    purchaseOrderId: string,
    @Query() query: QueryGoodsReceiptsDto,
  ): Promise<PaginatedGoodsReceiptsResponseDto> {
    return this.goodsReceiptsService.findGoodsReceiptsByPurchaseOrder(
      purchaseOrderId,
      query,
    );
  }
}
