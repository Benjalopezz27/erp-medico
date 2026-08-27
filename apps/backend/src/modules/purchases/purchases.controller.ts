import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserRole } from '@erp/shared-types';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles, CurrentUser } from '../auth/decorators';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PurchaseOrdersService } from './services/purchase-orders.service';
import { BackordersService } from './services/backorders.service';
import {
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
  CancelPurchaseOrderDto,
  QueryPurchaseOrderDto,
  PurchaseOrderDetailResponseDto,
  PaginatedPurchaseOrdersResponseDto,
  QueryBackordersDto,
  BackordersResponseDto,
} from './dto';

@ApiTags('purchase-orders')
@ApiBearerAuth('JWT-auth')
@Controller('purchase-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRADOR)
export class PurchasesController {
  constructor(
    private readonly purchaseOrdersService: PurchaseOrdersService,
    private readonly backordersService: BackordersService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new purchase order draft with line items',
  })
  @ApiResponse({
    status: 201,
    description: 'Purchase order draft created successfully',
    type: PurchaseOrderDetailResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input payload or inactive supplier/product',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires ADMINISTRADOR role',
  })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  async create(
    @Body() dto: CreatePurchaseOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PurchaseOrderDetailResponseDto> {
    return this.purchaseOrdersService.create(dto, user.id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a draft purchase order (header and/or line items)',
  })
  @ApiResponse({
    status: 200,
    description: 'Purchase order updated successfully',
    type: PurchaseOrderDetailResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input payload or supplier change without items',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires ADMINISTRADOR role',
  })
  @ApiResponse({ status: 404, description: 'Purchase order not found' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - purchase order is not in BORRADOR status',
  })
  async updateDraft(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePurchaseOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PurchaseOrderDetailResponseDto> {
    return this.purchaseOrdersService.updateDraft(id, dto, user.id);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List purchase orders with pagination, sorting and filters',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of purchase orders',
    type: PaginatedPurchaseOrdersResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires ADMINISTRADOR role',
  })
  async findAll(
    @Query() query: QueryPurchaseOrderDto,
  ): Promise<PaginatedPurchaseOrdersResponseDto> {
    return this.purchaseOrdersService.findAll(query);
  }

  @Get('pending')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List pending purchase order balances grouped by supplier',
  })
  @ApiResponse({
    status: 200,
    description:
      'Pending EMITIDA and PARCIAL purchase orders grouped by supplier',
    type: BackordersResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid filters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires ADMINISTRADOR role',
  })
  async findPending(
    @Query() query: QueryBackordersDto,
  ): Promise<BackordersResponseDto> {
    return this.backordersService.findPending(query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get full purchase order details by ID' })
  @ApiResponse({
    status: 200,
    description: 'Purchase order detail',
    type: PurchaseOrderDetailResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires ADMINISTRADOR role',
  })
  @ApiResponse({ status: 404, description: 'Purchase order not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PurchaseOrderDetailResponseDto> {
    return this.purchaseOrdersService.findOne(id);
  }

  @Patch(':id/emit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Emit a draft purchase order, freezing snapshots and transitioning to EMITIDA',
  })
  @ApiResponse({
    status: 200,
    description: 'Purchase order successfully emitted',
    type: PurchaseOrderDetailResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid order, empty items, or inactive supplier/product',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires ADMINISTRADOR role',
  })
  @ApiResponse({ status: 404, description: 'Purchase order not found' })
  @ApiResponse({
    status: 409,
    description:
      'Conflict - PO is not in BORRADOR or supplier product association changed',
  })
  async emit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PurchaseOrderDetailResponseDto> {
    return this.purchaseOrdersService.emit(id, user.id);
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Cancel a purchase order from BORRADOR, EMITIDA, or PARCIAL status',
  })
  @ApiResponse({
    status: 200,
    description: 'Purchase order successfully cancelled',
    type: PurchaseOrderDetailResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input payload' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires ADMINISTRADOR role',
  })
  @ApiResponse({ status: 404, description: 'Purchase order not found' })
  @ApiResponse({
    status: 409,
    description:
      'Conflict - PO is in a terminal status (COMPLETADA or CANCELADA)',
  })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelPurchaseOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PurchaseOrderDetailResponseDto> {
    return this.purchaseOrdersService.cancel(id, dto, user.id);
  }
}
