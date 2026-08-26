import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@erp/shared-types';
import { JwtAuthGuard, RolesGuard } from '../../auth/guards';
import { Roles, CurrentUser } from '../../auth/decorators';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { SupplierImportTemplatesService } from '../services/supplier-import-templates.service';
import {
  CreateSupplierImportTemplateDto,
  UpdateSupplierImportTemplateDto,
  QuerySupplierImportTemplateDto,
  SupplierImportTemplateResponseDto,
} from '../dto';

@ApiTags('importer')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRADOR)
@Controller('suppliers/:supplierId/import-templates')
export class SupplierImportTemplatesController {
  constructor(
    private readonly templatesService: SupplierImportTemplatesService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear una nueva plantilla de importación para un proveedor',
  })
  @ApiParam({
    name: 'supplierId',
    description: 'UUID del proveedor',
    type: 'string',
  })
  @ApiResponse({
    status: 201,
    description: 'Plantilla creada con éxito',
    type: SupplierImportTemplateResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Mapeo inválido o proveedor inactivo',
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({
    status: 403,
    description: 'Requiere rol ADMINISTRADOR',
  })
  @ApiResponse({ status: 404, description: 'Proveedor no encontrado' })
  @ApiResponse({
    status: 409,
    description: 'Nombre o fingerprint duplicado para este proveedor',
  })
  create(
    @Param('supplierId', new ParseUUIDPipe({ version: '4' }))
    supplierId: string,
    @Body() dto: CreateSupplierImportTemplateDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<SupplierImportTemplateResponseDto> {
    return this.templatesService.create(supplierId, dto, actor.id);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar plantillas de importación de un proveedor',
  })
  @ApiParam({
    name: 'supplierId',
    description: 'UUID del proveedor',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de plantillas del proveedor',
    type: [SupplierImportTemplateResponseDto],
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({
    status: 403,
    description: 'Requiere rol ADMINISTRADOR',
  })
  @ApiResponse({ status: 404, description: 'Proveedor no encontrado' })
  findAll(
    @Param('supplierId', new ParseUUIDPipe({ version: '4' }))
    supplierId: string,
    @Query() query: QuerySupplierImportTemplateDto,
  ): Promise<SupplierImportTemplateResponseDto[]> {
    return this.templatesService.findAllBySupplier(supplierId, query);
  }

  @Get(':templateId')
  @ApiOperation({
    summary: 'Obtener detalle de una plantilla de importación',
  })
  @ApiParam({
    name: 'supplierId',
    description: 'UUID del proveedor',
    type: 'string',
  })
  @ApiParam({
    name: 'templateId',
    description: 'UUID de la plantilla',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalle de la plantilla',
    type: SupplierImportTemplateResponseDto,
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({
    status: 403,
    description: 'Requiere rol ADMINISTRADOR',
  })
  @ApiResponse({
    status: 404,
    description: 'Plantilla o proveedor no encontrado',
  })
  findOne(
    @Param('supplierId', new ParseUUIDPipe({ version: '4' }))
    supplierId: string,
    @Param('templateId', new ParseUUIDPipe({ version: '4' }))
    templateId: string,
  ): Promise<SupplierImportTemplateResponseDto> {
    return this.templatesService.findOne(supplierId, templateId);
  }

  @Patch(':templateId')
  @ApiOperation({
    summary: 'Actualizar o renombrar una plantilla de importación',
  })
  @ApiParam({
    name: 'supplierId',
    description: 'UUID del proveedor',
    type: 'string',
  })
  @ApiParam({
    name: 'templateId',
    description: 'UUID de la plantilla',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Plantilla actualizada con éxito',
    type: SupplierImportTemplateResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Payload inválido o mapeo incorrecto',
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({
    status: 403,
    description: 'Requiere rol ADMINISTRADOR',
  })
  @ApiResponse({
    status: 404,
    description: 'Plantilla o proveedor no encontrado',
  })
  @ApiResponse({
    status: 409,
    description: 'Nombre duplicado para este proveedor',
  })
  update(
    @Param('supplierId', new ParseUUIDPipe({ version: '4' }))
    supplierId: string,
    @Param('templateId', new ParseUUIDPipe({ version: '4' }))
    templateId: string,
    @Body() dto: UpdateSupplierImportTemplateDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<SupplierImportTemplateResponseDto> {
    return this.templatesService.update(supplierId, templateId, dto, actor.id);
  }

  @Delete(':templateId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar una plantilla de importación',
  })
  @ApiParam({
    name: 'supplierId',
    description: 'UUID del proveedor',
    type: 'string',
  })
  @ApiParam({
    name: 'templateId',
    description: 'UUID de la plantilla',
    type: 'string',
  })
  @ApiResponse({
    status: 204,
    description: 'Plantilla eliminada con éxito',
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({
    status: 403,
    description: 'Requiere rol ADMINISTRADOR',
  })
  @ApiResponse({
    status: 404,
    description: 'Plantilla o proveedor no encontrado',
  })
  delete(
    @Param('supplierId', new ParseUUIDPipe({ version: '4' }))
    supplierId: string,
    @Param('templateId', new ParseUUIDPipe({ version: '4' }))
    templateId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    return this.templatesService.delete(supplierId, templateId, actor.id);
  }
}
