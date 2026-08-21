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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UnitsService } from './units.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { UnitResponseDto } from './dto/unit-response.dto';

@ApiTags('units')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas las unidades de medida' })
  @ApiResponse({
    status: 200,
    description: 'Listado completo de unidades de medida ordenadas por nombre',
    type: [UnitResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado / Token JWT no proporcionado o inválido',
  })
  async findAll(): Promise<UnitResponseDto[]> {
    return this.unitsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una unidad de medida por su ID' })
  @ApiParam({
    name: 'id',
    description: 'UUID de la unidad de medida',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalle de la unidad de medida encontrada',
    type: UnitResponseDto,
  })
  @ApiResponse({ status: 400, description: 'ID con formato UUID inválido' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Unidad de medida no encontrada' })
  async findById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<UnitResponseDto> {
    return this.unitsService.findById(id);
  }

  @Post()
  @Roles(UserRole.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Crear una nueva unidad de medida (Sólo Administrador)',
  })
  @ApiResponse({
    status: 201,
    description: 'Unidad de medida creada exitosamente',
    type: UnitResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado / Requiere rol ADMINISTRADOR',
  })
  @ApiResponse({
    status: 409,
    description: 'Ya existe una unidad de medida con ese nombre o símbolo',
  })
  async create(@Body() dto: CreateUnitDto): Promise<UnitResponseDto> {
    return this.unitsService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Actualizar una unidad de medida existente (Sólo Administrador)',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la unidad de medida',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Unidad de medida actualizada exitosamente',
    type: UnitResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos o sin cambios',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado / Requiere rol ADMINISTRADOR',
  })
  @ApiResponse({ status: 404, description: 'Unidad de medida no encontrada' })
  @ApiResponse({
    status: 409,
    description: 'Ya existe una unidad de medida con ese nombre o símbolo',
  })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateUnitDto,
  ): Promise<UnitResponseDto> {
    return this.unitsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMINISTRADOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar una unidad de medida (Sólo Administrador)',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la unidad de medida',
    format: 'uuid',
  })
  @ApiResponse({
    status: 204,
    description: 'Unidad de medida eliminada exitosamente',
  })
  @ApiResponse({ status: 400, description: 'ID con formato UUID inválido' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado / Requiere rol ADMINISTRADOR',
  })
  @ApiResponse({ status: 404, description: 'Unidad de medida no encontrada' })
  @ApiResponse({
    status: 409,
    description:
      'No se puede eliminar la unidad de medida porque está asociada a productos existentes',
  })
  async delete(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<void> {
    return this.unitsService.delete(id);
  }
}
