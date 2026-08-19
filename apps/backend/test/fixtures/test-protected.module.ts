import { Controller, Get, Module, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@erp/shared-types';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { JwtAuthGuard } from '../../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../src/modules/auth/guards/roles.guard';
import { Roles } from '../../src/modules/auth/decorators/roles.decorator';

@Controller('test-protected')
export class TestProtectedController {
  @Get('authenticated')
  @UseGuards(JwtAuthGuard)
  getAuthenticated(@Req() req: any) {
    return { message: 'authenticated-ok', user: req.user };
  }

  @Get('admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRADOR)
  getAdminOnly() {
    return { message: 'admin-only-ok' };
  }

  @Get('vendedor-allowed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRADOR, UserRole.VENDEDOR)
  getVendedorAllowed() {
    return { message: 'vendedor-allowed-ok' };
  }
}

@Module({
  imports: [AuthModule],
  controllers: [TestProtectedController],
})
export class TestProtectedModule {}
