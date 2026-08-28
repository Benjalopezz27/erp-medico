import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  IMarkupConfiguration,
  IMarkupSimulation,
  UserRole,
} from '@erp/shared-types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User } from '../users/entities/user.entity';
import { CreateMarkupConfigurationDto } from './dto/create-markup-configuration.dto';
import { UpdateMarkupConfigurationDto } from './dto/update-markup-configuration.dto';
import { PricesService } from './prices.service';

@ApiTags('prices')
@Controller('prices')
export class PricesController {
  constructor(private readonly pricesService: PricesService) {}
  @Get('status')
  @ApiOperation({ summary: 'Check Prices module status' })
  getStatus() {
    return this.pricesService.getStatus();
  }
  @Get('markups')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Listar configuraciones de markup' })
  findAll(): Promise<IMarkupConfiguration[]> {
    return this.pricesService.findAll();
  }
  @Get('markups/simulate/:productId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Simular precio sugerido con markup efectivo' })
  simulate(
    @Param('productId', ParseUUIDPipe) productId: string,
  ): Promise<IMarkupSimulation> {
    return this.pricesService.simulate(productId);
  }
  @Post('markups')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRADOR)
  create(
    @Body() dto: CreateMarkupConfigurationDto,
    @CurrentUser() user: User,
  ): Promise<IMarkupConfiguration> {
    return this.pricesService.create(dto, user.id);
  }
  @Patch('markups/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRADOR)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMarkupConfigurationDto,
    @CurrentUser() user: User,
  ): Promise<IMarkupConfiguration> {
    return this.pricesService.update(id, dto, user.id);
  }
  @Delete('markups/:id')
  @HttpCode(204)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRADOR)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.pricesService.remove(id, user.id);
  }
}
