import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@erp/shared-types';
import { ArcaService } from './arca.service';
import { ARCA_SERVICE } from './arca.constants';
import { IArcaService } from './interfaces/arca-service.interface';
import { ArcaHomologationService } from './services/arca-homologation.service';
import { ArcaCertificateLoader } from './services/arca-certificate-loader.service';
import { ArcaClockSyncService } from './services/arca-clock-sync.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('arca')
@Controller('arca')
export class ArcaController {
  constructor(
    private readonly arcaService: ArcaService,
    @Inject(ARCA_SERVICE) private readonly arcaClient: IArcaService,
    private readonly certLoader: ArcaCertificateLoader,
    private readonly clockSyncService: ArcaClockSyncService,
    private readonly configService: ConfigService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Check ARCA module status' })
  @ApiResponse({ status: 200, description: 'ARCA module operational' })
  getStatus() {
    return this.arcaService.getStatus();
  }

  @Get('probe')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRADOR)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Admin diagnostic probe for ARCA WSAA connectivity and certificate status',
  })
  @ApiResponse({ status: 200, description: 'Sanitized ARCA probe diagnostics' })
  async getProbe() {
    const arcaEnv = this.configService.get<string>('ARCA_ENV') || 'disabled';

    if (this.arcaClient instanceof ArcaHomologationService) {
      const probeResult = await this.arcaClient.probeWsaaConnection();
      return {
        environment: arcaEnv,
        ...probeResult,
      };
    }

    let certInfo: any = null;
    try {
      const cert = this.certLoader.loadCertificate();
      certInfo = {
        hasCertificate: true,
        subject: cert.subject,
        validTo: cert.validTo.toISOString(),
        daysRemaining: cert.daysRemaining,
        isExpired: cert.isExpired,
      };
    } catch {
      certInfo = {
        hasCertificate: false,
        notice: 'No certificate configured or invalid format.',
      };
    }

    const clockResult = await this.clockSyncService.verifyClockSync();

    return {
      environment: arcaEnv,
      mode: this.arcaClient.constructor.name,
      certificate: certInfo,
      clockSync: clockResult,
      wsfeEmissionStatus: 'disabled_until_sprint_8',
    };
  }
}
