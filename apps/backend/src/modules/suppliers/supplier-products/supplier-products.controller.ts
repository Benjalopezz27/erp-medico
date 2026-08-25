import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
  ApiParam,
} from '@nestjs/swagger';
import { SupplierProductsService } from './supplier-products.service';
import { JwtAuthGuard, RolesGuard } from '../../auth/guards';
import { Roles, CurrentUser } from '../../auth/decorators';
import { UserRole } from '@erp/shared-types';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import {
  CreateSupplierProductDto,
  UpdateSupplierProductDto,
  QuerySupplierProductDto,
  SupplierProductResponseDto,
  PaginatedSupplierProductsResponseDto,
} from './dto';

@ApiTags('suppliers')
@ApiBearerAuth('JWT-auth')
@Controller('suppliers/:supplierId/products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRADOR)
export class SupplierProductsController {
  constructor(
    private readonly supplierProductsService: SupplierProductsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Associate a product with a supplier dictionary mapping',
  })
  @ApiParam({
    name: 'supplierId',
    description: 'UUID del proveedor',
    type: 'string',
  })
  @ApiResponse({
    status: 201,
    description: 'Mapping successfully created',
    type: SupplierProductResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid input payload, inactive supplier/product, or conversion factor mismatch',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires ADMINISTRADOR role',
  })
  @ApiResponse({
    status: 404,
    description: 'Supplier, product, or unit not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Duplicate product mapping or duplicate SKU',
  })
  create(
    @Param('supplierId', new ParseUUIDPipe({ version: '4' }))
    supplierId: string,
    @Body() dto: CreateSupplierProductDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<SupplierProductResponseDto> {
    return this.supplierProductsService.create(supplierId, dto, actor.id);
  }

  @Get()
  @ApiOperation({
    summary: 'List paginated product mappings for a specific supplier',
  })
  @ApiParam({
    name: 'supplierId',
    description: 'UUID del proveedor',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of supplier product mappings',
    type: PaginatedSupplierProductsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires ADMINISTRADOR role',
  })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  findAll(
    @Param('supplierId', new ParseUUIDPipe({ version: '4' }))
    supplierId: string,
    @Query() query: QuerySupplierProductDto,
  ): Promise<PaginatedSupplierProductsResponseDto> {
    return this.supplierProductsService.findAll(supplierId, query);
  }

  @Get(':associationId')
  @ApiOperation({
    summary: 'Get details of a specific supplier product mapping',
  })
  @ApiParam({
    name: 'supplierId',
    description: 'UUID del proveedor',
    type: 'string',
  })
  @ApiParam({
    name: 'associationId',
    description: 'UUID de la asociación',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Mapping details',
    type: SupplierProductResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires ADMINISTRADOR role',
  })
  @ApiResponse({
    status: 404,
    description: 'Supplier or mapping not found',
  })
  findOne(
    @Param('supplierId', new ParseUUIDPipe({ version: '4' }))
    supplierId: string,
    @Param('associationId', new ParseUUIDPipe({ version: '4' }))
    associationId: string,
  ): Promise<SupplierProductResponseDto> {
    return this.supplierProductsService.findOne(supplierId, associationId);
  }

  @Patch(':associationId')
  @ApiOperation({
    summary: 'Update attributes of a supplier product mapping',
  })
  @ApiParam({
    name: 'supplierId',
    description: 'UUID del proveedor',
    type: 'string',
  })
  @ApiParam({
    name: 'associationId',
    description: 'UUID de la asociación',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Mapping successfully updated',
    type: SupplierProductResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid payload, inactive supplier, factor mismatch, or no-op update',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires ADMINISTRADOR role',
  })
  @ApiResponse({
    status: 404,
    description: 'Supplier or mapping not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Duplicate SKU for this supplier',
  })
  update(
    @Param('supplierId', new ParseUUIDPipe({ version: '4' }))
    supplierId: string,
    @Param('associationId', new ParseUUIDPipe({ version: '4' }))
    associationId: string,
    @Body() dto: UpdateSupplierProductDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<SupplierProductResponseDto> {
    return this.supplierProductsService.update(
      supplierId,
      associationId,
      dto,
      actor.id,
    );
  }

  @Delete(':associationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Physically delete a supplier product mapping with audit trail',
  })
  @ApiParam({
    name: 'supplierId',
    description: 'UUID del proveedor',
    type: 'string',
  })
  @ApiParam({
    name: 'associationId',
    description: 'UUID de la asociación',
    type: 'string',
  })
  @ApiResponse({
    status: 204,
    description: 'Mapping successfully deleted (No Content)',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires ADMINISTRADOR role',
  })
  @ApiResponse({
    status: 404,
    description: 'Supplier or mapping not found',
  })
  @ApiResponse({
    status: 409,
    description:
      'Conflict - Cannot delete mapping because it is referenced in other records',
  })
  delete(
    @Param('supplierId', new ParseUUIDPipe({ version: '4' }))
    supplierId: string,
    @Param('associationId', new ParseUUIDPipe({ version: '4' }))
    associationId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    return this.supplierProductsService.delete(
      supplierId,
      associationId,
      actor.id,
    );
  }
}
