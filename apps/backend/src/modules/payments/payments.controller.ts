import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IRegisterPaymentResponse, UserRole } from '@erp/shared-types';
import { CurrentUser, Roles } from '../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { RegisterPaymentDto } from './dto/register-payment.dto';
import { PaymentsService } from './payments.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Public()
  @Get('status')
  @ApiOperation({ summary: 'Check Payments module status' })
  @ApiResponse({ status: 200, description: 'Payments module operational' })
  getStatus() {
    return this.paymentsService.getStatus();
  }

  @Post()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRADOR, UserRole.VENDEDOR)
  @ApiOperation({
    summary:
      'Registrar cobro y aplicarlo a facturas (dirigido o por antigüedad); emite recibo',
  })
  @ApiResponse({ status: 201, description: 'Cobro y recibo creados' })
  @ApiResponse({ status: 400, description: 'Datos o aplicación inválidos' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Cliente inexistente' })
  @ApiResponse({ status: 409, description: 'Monto excede el saldo' })
  register(
    @Body() dto: RegisterPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<IRegisterPaymentResponse> {
    return this.paymentsService.register(dto, user.id);
  }
}
