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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@erp/shared-types';
import { CurrentUser, Roles } from '../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import {
  CustomerResponseDto,
  PaginatedCustomersResponseDto,
} from './dto/customer-response.dto';
import { QueryCustomerDto } from './dto/query-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@ApiTags('customers')
@ApiBearerAuth('JWT-auth')
@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRADOR, UserRole.VENDEDOR)
@ApiResponse({ status: 401, description: 'No autenticado' })
@ApiResponse({ status: 403, description: 'Operación o campo no autorizado' })
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear un cliente' })
  @ApiResponse({ status: 201, type: CustomerResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Documento, condición fiscal o límite inválido',
  })
  @ApiResponse({ status: 409, description: 'Documento ya registrado' })
  create(
    @Body() dto: CreateCustomerDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<CustomerResponseDto> {
    return this.customersService.create(dto, actor);
  }

  @Get()
  @ApiOperation({ summary: 'Listar y buscar clientes' })
  @ApiResponse({ status: 200, type: PaginatedCustomersResponseDto })
  findAll(
    @Query() query: QueryCustomerDto,
  ): Promise<PaginatedCustomersResponseDto> {
    return this.customersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar un cliente, incluso inactivo' })
  @ApiResponse({ status: 200, type: CustomerResponseDto })
  @ApiResponse({ status: 404, description: 'Cliente inexistente' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CustomerResponseDto> {
    return this.customersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar parcialmente un cliente' })
  @ApiResponse({ status: 200, type: CustomerResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Payload inválido o sin cambios efectivos',
  })
  @ApiResponse({ status: 404, description: 'Cliente inexistente' })
  @ApiResponse({
    status: 409,
    description: 'Documento duplicado o conflicto concurrente',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<CustomerResponseDto> {
    return this.customersService.update(id, dto, actor);
  }

  @Delete(':id')
  @Roles(UserRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Desactivar un cliente sin borrarlo' })
  @ApiResponse({ status: 200, type: CustomerResponseDto })
  @ApiResponse({ status: 400, description: 'El cliente ya está inactivo' })
  @ApiResponse({ status: 404, description: 'Cliente inexistente' })
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<CustomerResponseDto> {
    return this.customersService.deactivate(id, actor);
  }

  @Patch(':id/reactivate')
  @Roles(UserRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Reactivar un cliente' })
  @ApiResponse({ status: 200, type: CustomerResponseDto })
  @ApiResponse({ status: 400, description: 'El cliente ya está activo' })
  @ApiResponse({ status: 404, description: 'Cliente inexistente' })
  reactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<CustomerResponseDto> {
    return this.customersService.reactivate(id, actor);
  }
}
