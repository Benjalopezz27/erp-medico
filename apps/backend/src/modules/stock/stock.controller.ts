import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UserRole } from '@erp/shared-types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { StockService } from './stock.service';
import { StockAdjustmentsService } from './stock-adjustments.service';
import {
  QueryStockDto,
  PaginatedStockResponseDto,
  QueryStockMovementsDto,
  PaginatedStockMovementsResponseDto,
  QueryStockEvolutionDto,
  StockEvolutionResponseDto,
  CreateStockAdjustmentDto,
  StockMovementResponseDto,
  QueryStockAlertsDto,
} from './dto';

@ApiTags('stock')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('stock')
export class StockController {
  constructor(
    private readonly stockService: StockService,
    private readonly stockAdjustmentsService: StockAdjustmentsService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Check Stock module status' })
  @ApiResponse({ status: 200, description: 'Stock module operational' })
  getStatus() {
    return this.stockService.getStatus();
  }

  @Get('alerts')
  @Roles(UserRole.ADMINISTRADOR, UserRole.VENDEDOR)
  @ApiOperation({
    summary:
      'List products with stock balance at or below minimum threshold (low stock alerts)',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated low stock alerts list',
    type: PaginatedStockResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findStockAlerts(
    @Query() query: QueryStockAlertsDto,
  ): Promise<PaginatedStockResponseDto> {
    return this.stockService.findStockAlerts(query);
  }

  @Get()
  @Roles(UserRole.ADMINISTRADOR, UserRole.VENDEDOR)
  @ApiOperation({
    summary:
      'List consolidated stock overview for active products with status, category, and unit',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated active products stock overview list',
    type: PaginatedStockResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAllStock(
    @Query() query: QueryStockDto,
  ): Promise<PaginatedStockResponseDto> {
    return this.stockService.findAllStock(query);
  }

  @Post('adjustments')
  @Roles(UserRole.ADMINISTRADOR)
  @ApiOperation({
    summary:
      'Record a manual stock adjustment (AJUSTE_ENTRADA, AJUSTE_SALIDA, MERMA) with atomic audit log',
  })
  @ApiResponse({
    status: 201,
    description: 'Stock adjustment successfully recorded',
    type: StockMovementResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid adjustment payload, inactive product, or negative quantity',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - Only ADMINISTRADOR can register stock adjustments',
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({
    status: 422,
    description:
      'Unprocessable Entity - Insufficient stock for outward adjustment',
  })
  async createAdjustment(
    @Body() dto: CreateStockAdjustmentDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<StockMovementResponseDto> {
    return this.stockAdjustmentsService.createAdjustment(dto, actor);
  }

  @Get(':productId/movements')
  @Roles(UserRole.ADMINISTRADOR, UserRole.VENDEDOR)
  @ApiOperation({
    summary:
      'List paginated immutable movement ledger (kardex) for a specific product',
  })
  @ApiParam({
    name: 'productId',
    description: 'Product UUID v4',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated product movement ledger history',
    type: PaginatedStockMovementsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid query filters or date range',
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findProductMovements(
    @Param('productId', new ParseUUIDPipe({ version: '4' })) productId: string,
    @Query() query: QueryStockMovementsDto,
  ): Promise<PaginatedStockMovementsResponseDto> {
    return this.stockService.findProductMovements(productId, query);
  }

  @Get(':productId/evolution')
  @Roles(UserRole.ADMINISTRADOR, UserRole.VENDEDOR)
  @ApiOperation({
    summary:
      'Retrieve bounded time-series data points for the stock evolution chart',
  })
  @ApiParam({
    name: 'productId',
    description: 'Product UUID v4',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Chronological stock evolution points and baseline balance',
    type: StockEvolutionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid date range' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findStockEvolution(
    @Param('productId', new ParseUUIDPipe({ version: '4' })) productId: string,
    @Query() query: QueryStockEvolutionDto,
  ): Promise<StockEvolutionResponseDto> {
    return this.stockService.findStockEvolution(productId, query);
  }
}
