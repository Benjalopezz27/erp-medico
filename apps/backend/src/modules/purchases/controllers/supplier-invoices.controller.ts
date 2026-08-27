import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  IPaginatedPendingInvoiceReceiptsResponse,
  IPaginatedSupplierInvoicesResponse,
  ISupplierInvoiceDetail,
  UserRole,
} from '@erp/shared-types';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { CreateSupplierInvoiceDto } from '../dto/create-supplier-invoice.dto';
import { QuerySupplierInvoicesDto } from '../dto/query-supplier-invoices.dto';
import { QueryPendingInvoiceReceiptsDto } from '../dto/query-pending-invoice-receipts.dto';
import { SupplierInvoicesService } from '../services/supplier-invoices.service';
import { SupplierInvoiceDecisionsService } from '../services/supplier-invoice-decisions.service';
import { RejectSupplierInvoiceDto } from '../dto/reject-supplier-invoice.dto';
import {
  PaginatedPendingInvoiceReceiptsResponseDto,
  PaginatedSupplierInvoicesResponseDto,
  SupplierInvoiceResponseDto,
} from '../dto/supplier-invoice-response.dto';

@ApiTags('Supplier Invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRADOR)
@Controller('supplier-invoices')
export class SupplierInvoicesController {
  constructor(
    private readonly supplierInvoicesService: SupplierInvoicesService,
    private readonly decisionsService: SupplierInvoiceDecisionsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registrar y conciliar atómicamente una factura de proveedor',
  })
  @ApiCreatedResponse({
    description: 'Factura creada en VALIDANDO u OBSERVADA',
    type: SupplierInvoiceResponseDto,
  })
  @ApiConflictResponse({
    description:
      'Comprobante duplicado o conflicto de conciliación/concurrencia',
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  create(
    @Body() dto: CreateSupplierInvoiceDto,
    @CurrentUser() user: User,
  ): Promise<ISupplierInvoiceDetail> {
    return this.supplierInvoicesService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar facturas de proveedor con filtros y paginación',
  })
  @ApiOkResponse({
    description: 'Facturas ordenadas por fecha de creación descendente',
    type: PaginatedSupplierInvoicesResponseDto,
  })
  findAll(
    @Query() query: QuerySupplierInvoicesDto,
  ): Promise<IPaginatedSupplierInvoicesResponse> {
    return this.supplierInvoicesService.findAll(query);
  }

  // Must remain before :id so the static segment is never parsed as a UUID.
  @Get('pending-receipts')
  @ApiOperation({
    summary: 'Listar recepciones con cantidades pendientes de facturación',
  })
  @ApiOkResponse({
    description: 'Recepciones y líneas con saldo disponible',
    type: PaginatedPendingInvoiceReceiptsResponseDto,
  })
  findPendingReceipts(
    @Query() query: QueryPendingInvoiceReceiptsDto,
  ): Promise<IPaginatedPendingInvoiceReceiptsResponse> {
    return this.supplierInvoicesService.findPendingReceipts(query);
  }

  @Patch(':id/authorize')
  @ApiOperation({ summary: 'Autorizar manualmente una factura observada' })
  @ApiOkResponse({ type: SupplierInvoiceResponseDto })
  authorize(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: User,
  ): Promise<ISupplierInvoiceDetail> {
    return this.decisionsService.authorize(id, user.id);
  }

  @Patch(':id/reject')
  @ApiOperation({
    summary: 'Rechazar una factura observada y liberar su reserva',
  })
  @ApiOkResponse({ type: SupplierInvoiceResponseDto })
  reject(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: RejectSupplierInvoiceDto,
    @CurrentUser() user: User,
  ): Promise<ISupplierInvoiceDetail> {
    return this.decisionsService.reject(id, user.id, dto.reason);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Consultar el detalle inmutable de una factura de proveedor',
  })
  @ApiOkResponse({
    description: 'Factura con líneas, snapshots y conciliación',
    type: SupplierInvoiceResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Factura inexistente' })
  findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ISupplierInvoiceDetail> {
    return this.supplierInvoicesService.findOne(id);
  }
}
