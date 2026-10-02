import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiExtraModels,
  getSchemaPath,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { UserRole } from '@erp/shared-types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { User } from '../users/entities/user.entity';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { CreateProductUnitConversionDto } from './dto/create-product-unit-conversion.dto';
import { UpdateProductUnitConversionDto } from './dto/update-product-unit-conversion.dto';
import { ProductAdminResponseDto } from './dto/product-admin-response.dto';
import { ProductSellerResponseDto } from './dto/product-seller-response.dto';
import { ProductSummaryResponseDto } from './dto/product-summary-response.dto';
import { ProductUnitConversionResponseDto } from './dto/product-unit-conversion-response.dto';
import { SearchProductsDto } from './dto/search-products.dto';
import {
  PaginatedProductsAdminResponseDto,
  PaginatedProductsSellerResponseDto,
} from './dto/paginated-products-response.dto';
import {
  QueryProductBulkLoadTemplateDto,
  ConfirmProductBulkLoadDto,
  ProductBulkLoadPreviewResponseDto,
  ProductBulkLoadConfirmResponseDto,
} from './dto/bulk-load';
import { ProductBulkLoadService } from './bulk-load/product-bulk-load.service';

@ApiTags('products')
@ApiBearerAuth('JWT-auth')
@ApiExtraModels(
  ProductAdminResponseDto,
  ProductSellerResponseDto,
  ProductSummaryResponseDto,
  PaginatedProductsAdminResponseDto,
  PaginatedProductsSellerResponseDto,
  ProductBulkLoadPreviewResponseDto,
  ProductBulkLoadConfirmResponseDto,
)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly productBulkLoadService: ProductBulkLoadService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List products with pagination and status filter',
    description:
      'Accessible to all authenticated users. Administrators receive full cost/markup data; sellers receive redacted views.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated product list',
    schema: {
      oneOf: [
        { $ref: getSchemaPath(PaginatedProductsAdminResponseDto) },
        { $ref: getSchemaPath(PaginatedProductsSellerResponseDto) },
      ],
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@Query() query: QueryProductsDto, @CurrentUser() user: User) {
    return this.productsService.findAll(query, user?.role);
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search active products by code or name for typeahead',
    description:
      'Accessible to all authenticated users. Returns lightweight summarized active products with zero pricing secrets.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of matching active product summaries',
    type: [ProductSummaryResponseDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid search query (minimum 2 characters required)',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async search(@Query() query: SearchProductsDto) {
    return this.productsService.searchTypeahead(query);
  }

  @Get('bulk-load/template')
  @Roles(UserRole.ADMINISTRADOR)
  @ApiOperation({
    summary:
      'Download product bulk load template with reference sheet (CSV or XLSX)',
  })
  @ApiResponse({
    status: 200,
    description: 'Template file stream with headers and reference sheet',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only ADMINISTRADOR can download templates',
  })
  async downloadBulkLoadTemplate(
    @Query() query: QueryProductBulkLoadTemplateDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const template = await this.productBulkLoadService.generateTemplate(
      query.format || 'xlsx',
    );
    res.set({
      'Content-Type': template.contentType,
      'Content-Disposition': `attachment; filename="${template.filename}"`,
    });
    return new StreamableFile(template.buffer);
  }

  @Post('bulk-load/preview')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMINISTRADOR)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Upload and preview CSV/XLSX product catalog bulk load without committing',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Preview summary, row validations, and checksums',
    type: ProductBulkLoadPreviewResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid file or header structure' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 413, description: 'File too large (> 2 MiB)' })
  @ApiResponse({ status: 415, description: 'Unsupported media type' })
  async previewBulkLoad(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ProductBulkLoadPreviewResponseDto> {
    return this.productBulkLoadService.previewBulkLoad(file);
  }

  @Post('bulk-load/confirm')
  @Roles(UserRole.ADMINISTRADOR)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Confirm and atomically apply product catalog bulk load with anti-tamper checksum verification',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        previewFileChecksum: { type: 'string' },
      },
      required: ['file', 'previewFileChecksum'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Product bulk load atomically confirmed and created',
    type: ProductBulkLoadConfirmResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation failed on rows' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - File checksum mismatch or batch already confirmed',
  })
  @ApiResponse({ status: 413, description: 'File too large (> 2 MiB)' })
  @ApiResponse({ status: 415, description: 'Unsupported media type' })
  async confirmBulkLoad(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ConfirmProductBulkLoadDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<ProductBulkLoadConfirmResponseDto> {
    return this.productBulkLoadService.confirmBulkLoad(
      file,
      dto.previewFileChecksum,
      actor,
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get product by ID',
    description:
      'Accessible to all authenticated users. Redacts costNet and markupPercentage for sellers.',
  })
  @ApiParam({ name: 'id', description: 'Product UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Product details',
    schema: {
      oneOf: [
        { $ref: getSchemaPath(ProductAdminResponseDto) },
        { $ref: getSchemaPath(ProductSellerResponseDto) },
      ],
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid UUID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.productsService.findById(id, user?.role);
  }

  @Post()
  @Roles(UserRole.ADMINISTRADOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new product with optional initial conversions and stock',
    description:
      'Restricted to ADMINISTRADOR. Atomically creates the product, presentation conversions, stock balance, and initial ledger movement when initialStock is greater than zero.',
  })
  @ApiResponse({
    status: 201,
    description: 'Product created successfully',
    type: ProductAdminResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or presentation unit equals base unit',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: requires ADMINISTRADOR',
  })
  @ApiResponse({
    status: 404,
    description: 'Category or Unit not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict while assigning the automatic internal code',
  })
  async create(
    @Body() dto: CreateProductDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<ProductAdminResponseDto> {
    return this.productsService.create(dto, actor);
  }

  @Patch(':id')
  @Roles(UserRole.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Update product by ID',
    description:
      'Restricted to ADMINISTRADOR. Supports partial delta updates. internalCode is immutable.',
  })
  @ApiParam({ name: 'id', description: 'Product UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Product updated successfully',
    type: ProductAdminResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'No modifications detected, invalid payload, or cannot modify baseUnitId with existing conversions',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: requires ADMINISTRADOR',
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<ProductAdminResponseDto> {
    return this.productsService.update(id, dto, actor);
  }

  @Delete(':id')
  @Roles(UserRole.ADMINISTRADOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deactivate product logically',
    description:
      'Restricted to ADMINISTRADOR. Sets status to INACTIVE. Does not physically delete record.',
  })
  @ApiParam({ name: 'id', description: 'Product UUID', type: 'string' })
  @ApiResponse({
    status: 204,
    description: 'Product logically deactivated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: requires ADMINISTRADOR',
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async deactivate(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.productsService.deactivate(id);
  }

  // --- Sub-resource: Conversions ---

  @Get(':id/conversions')
  @ApiOperation({
    summary: 'List presentation unit conversions for a product',
    description: 'Accessible to all authenticated users.',
  })
  @ApiParam({ name: 'id', description: 'Product UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Array of unit conversions',
    type: [ProductUnitConversionResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findConversions(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProductUnitConversionResponseDto[]> {
    return this.productsService.findConversions(id);
  }

  @Post(':id/conversions')
  @Roles(UserRole.ADMINISTRADOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add presentation unit conversion to product',
    description: 'Restricted to ADMINISTRADOR.',
  })
  @ApiParam({ name: 'id', description: 'Product UUID', type: 'string' })
  @ApiResponse({
    status: 201,
    description: 'Conversion created successfully',
    type: ProductUnitConversionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid factor or presentation unit is equal to product base unit',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: requires ADMINISTRADOR',
  })
  @ApiResponse({
    status: 404,
    description: 'Product or presentation unit not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict: conversion for presentation unit already exists',
  })
  async addConversion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateProductUnitConversionDto,
  ): Promise<ProductUnitConversionResponseDto> {
    return this.productsService.addConversion(id, dto);
  }

  @Patch(':id/conversions/:conversionId')
  @Roles(UserRole.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Update conversion factor for a presentation unit conversion',
    description: 'Restricted to ADMINISTRADOR.',
  })
  @ApiParam({ name: 'id', description: 'Product UUID', type: 'string' })
  @ApiParam({
    name: 'conversionId',
    description: 'Conversion UUID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversion updated successfully',
    type: ProductUnitConversionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid factor or no modifications detected',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: requires ADMINISTRADOR',
  })
  @ApiResponse({ status: 404, description: 'Conversion or product not found' })
  async updateConversion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('conversionId', ParseUUIDPipe) conversionId: string,
    @Body() dto: UpdateProductUnitConversionDto,
  ): Promise<ProductUnitConversionResponseDto> {
    return this.productsService.updateConversion(id, conversionId, dto);
  }

  @Delete(':id/conversions/:conversionId')
  @Roles(UserRole.ADMINISTRADOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete presentation unit conversion from product',
    description: 'Restricted to ADMINISTRADOR.',
  })
  @ApiParam({ name: 'id', description: 'Product UUID', type: 'string' })
  @ApiParam({
    name: 'conversionId',
    description: 'Conversion UUID',
    type: 'string',
  })
  @ApiResponse({
    status: 204,
    description: 'Conversion deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: requires ADMINISTRADOR',
  })
  @ApiResponse({ status: 404, description: 'Conversion or product not found' })
  async deleteConversion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('conversionId', ParseUUIDPipe) conversionId: string,
  ): Promise<void> {
    return this.productsService.deleteConversion(id, conversionId);
  }
}
