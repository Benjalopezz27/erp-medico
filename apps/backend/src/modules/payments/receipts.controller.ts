import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IReceiptDetail, UserRole } from '@erp/shared-types';
import { Roles } from '../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { ReceiptsService } from './receipts.service';

@ApiTags('payments')
@ApiBearerAuth('JWT-auth')
@Controller('receipts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRADOR, UserRole.VENDEDOR)
@ApiResponse({ status: 401, description: 'No autenticado' })
@ApiResponse({ status: 403, description: 'Rol no autorizado' })
@ApiResponse({ status: 404, description: 'Recibo inexistente' })
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Detalle del recibo con comprobantes aplicados' })
  getOne(@Param('id', ParseUUIDPipe) id: string): Promise<IReceiptDetail> {
    return this.receiptsService.getDetail(id);
  }
}
