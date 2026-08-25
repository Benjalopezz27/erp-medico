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
} from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles, CurrentUser } from '../auth/decorators';
import { UserRole } from '@erp/shared-types';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { QuerySupplierDto } from './dto/query-supplier.dto';
import { SupplierResponseDto } from './dto/supplier-response.dto';
import { PaginatedSuppliersResponseDto } from './dto/paginated-suppliers-response.dto';

@ApiTags('suppliers')
@ApiBearerAuth('JWT-auth')
@Controller('suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRADOR)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get('status')
  @ApiOperation({ summary: 'Check Suppliers module status' })
  @ApiResponse({ status: 200, description: 'Suppliers module operational' })
  getStatus() {
    return this.suppliersService.getStatus();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new supplier with automatic audit trail' })
  @ApiResponse({
    status: 201,
    description: 'Supplier successfully created',
    type: SupplierResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input payload or CUIT format',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: Requires ADMINISTRADOR role',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict: CUIT already registered',
  })
  async create(
    @Body() createSupplierDto: CreateSupplierDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<SupplierResponseDto> {
    return this.suppliersService.create(createSupplierDto, actor);
  }

  @Get()
  @ApiOperation({
    summary: 'List suppliers with pagination, search, and status filters',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated supplier list',
    type: PaginatedSuppliersResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: Requires ADMINISTRADOR role',
  })
  async findAll(
    @Query() query: QuerySupplierDto,
  ): Promise<PaginatedSuppliersResponseDto> {
    return this.suppliersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get supplier details by ID' })
  @ApiResponse({
    status: 200,
    description: 'Supplier details',
    type: SupplierResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: Requires ADMINISTRADOR role',
  })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SupplierResponseDto> {
    return this.suppliersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Update supplier attributes or reactivate with immutable audit logging',
  })
  @ApiResponse({
    status: 200,
    description: 'Supplier successfully updated',
    type: SupplierResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or empty/no-op update payload',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: Requires ADMINISTRADOR role',
  })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  @ApiResponse({
    status: 409,
    description: 'Conflict: CUIT already registered to another supplier',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<SupplierResponseDto> {
    return this.suppliersService.update(id, updateSupplierDto, actor);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete (deactivate) supplier' })
  @ApiResponse({
    status: 200,
    description: 'Supplier successfully deactivated',
    type: SupplierResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Supplier is already inactive' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: Requires ADMINISTRADOR role',
  })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<SupplierResponseDto> {
    return this.suppliersService.deactivate(id, actor);
  }
}
