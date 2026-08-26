import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ImporterErrorCode, UserRole } from '@erp/shared-types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { ImporterService } from './importer.service';
import { ImporterPreviewService } from './services/importer-preview.service';
import { SupplierProductsService } from '../suppliers/supplier-products/supplier-products.service';
import {
  UploadFileBodyDto,
  ImporterUploadResponseDto,
  ImporterPreviewMultipartDto,
  ImporterPreviewResponseDto,
  ResolveUnknownSkuDto,
} from './dto';
import { SupplierProductResponseDto } from '../suppliers/supplier-products/dto';
import { MulterExceptionFilter } from './filters/multer-exception.filter';
import { SECURE_SPREADSHEET_MAX_FILE_SIZE } from '../../shared/parsers/secure-spreadsheet-parser';

@ApiTags('importer')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRADOR)
@Controller('importer')
export class ImporterController {
  constructor(
    private readonly importerService: ImporterService,
    private readonly previewService: ImporterPreviewService,
    private readonly supplierProductsService: SupplierProductsService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Check Importer module status' })
  @ApiResponse({ status: 200, description: 'Importer module operational' })
  getStatus() {
    return this.importerService.getStatus();
  }

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @UseFilters(MulterExceptionFilter)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: SECURE_SPREADSHEET_MAX_FILE_SIZE, files: 1 },
    }),
  )
  @ApiOperation({
    summary: 'Subir y validar un archivo de proveedor sin persistirlo',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['supplierId', 'file'],
      properties: {
        supplierId: { type: 'string', format: 'uuid' },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 200, type: ImporterUploadResponseDto })
  @ApiResponse({ status: 400, description: 'Archivo o proveedor inválido' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Requiere rol ADMINISTRADOR' })
  @ApiResponse({ status: 404, description: 'Proveedor no encontrado' })
  @ApiResponse({ status: 413, description: 'Archivo mayor a 2 MiB' })
  @ApiResponse({ status: 415, description: 'Formato no soportado' })
  upload(
    @Body() body: UploadFileBodyDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ImporterUploadResponseDto> {
    return this.importerService.uploadFile(body, file);
  }

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @UseFilters(MulterExceptionFilter)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: SECURE_SPREADSHEET_MAX_FILE_SIZE,
        files: 1,
        fields: 10,
        fieldSize: 32 * 1024,
      },
    }),
  )
  @ApiOperation({
    summary:
      'Reparsear y previsualizar archivo completo con clasificación semántica y checksums',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['supplierId', 'expectedFileChecksum', 'mapping', 'file'],
      properties: {
        supplierId: { type: 'string', format: 'uuid' },
        expectedFileChecksum: { type: 'string' },
        mapping: { type: 'string' },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 200, type: ImporterPreviewResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Archivo, mapping o parámetros inválidos',
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Requiere rol ADMINISTRADOR' })
  @ApiResponse({ status: 404, description: 'Proveedor no encontrado' })
  @ApiResponse({
    status: 409,
    description: 'Checksum del archivo no coincide con la carga inicial',
  })
  @ApiResponse({ status: 413, description: 'Archivo mayor a 2 MiB' })
  @ApiResponse({ status: 415, description: 'Formato no soportado' })
  preview(
    @Body() body: ImporterPreviewMultipartDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ImporterPreviewResponseDto> {
    if (!file || !file.buffer) {
      throw new BadRequestException({
        code: ImporterErrorCode.IMPORTER_FILE_MISSING,
        message: 'El archivo es obligatorio para generar la vista previa.',
      });
    }
    return this.previewService.generatePreview(
      file.buffer,
      file.originalname,
      file.mimetype,
      body,
    );
  }

  @Post('resolve-unknown')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Resolver un SKU desconocido asociándolo a un producto del catálogo interno',
  })
  @ApiBody({ type: ResolveUnknownSkuDto })
  @ApiResponse({
    status: 201,
    description: 'Asociación de producto creada con éxito',
    type: SupplierProductResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Datos de asociación inválidos' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Requiere rol ADMINISTRADOR' })
  @ApiResponse({
    status: 404,
    description: 'Proveedor, producto o unidad no encontrada',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflicto de asociación o SKU duplicado',
  })
  resolveUnknown(
    @Body() dto: ResolveUnknownSkuDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SupplierProductResponseDto> {
    return this.supplierProductsService.create(
      dto.supplierId,
      {
        productId: dto.productId,
        supplierExternalCode: dto.supplierSku,
        supplierDescription: dto.supplierDescription,
        purchaseUnitId: dto.purchaseUnitId,
        conversionFactorToBase: dto.conversionFactorToBase,
        usualCostNet: dto.usualCostNet,
        isPrimarySupplier: false,
      },
      user.id,
    );
  }
}
