import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { SkipThrottle } from '@nestjs/throttler';
import {
  HealthCheckResponse,
  HealthLivenessResponse,
  HealthReadinessResponse,
  HealthService,
} from './health.service';

@ApiTags('health')
@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  @ApiOperation({
    summary: 'Liveness probe (process is running)',
    description:
      'Returns HTTP 200 indicating the Node.js application process is alive and accepting requests. Does not query external dependencies.',
  })
  @ApiResponse({
    status: 200,
    description: 'Process is alive',
  })
  checkLiveness(): HealthLivenessResponse {
    return this.healthService.checkLiveness();
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness probe (database connectivity check)',
    description:
      'Queries the PostgreSQL database to verify critical dependencies. Returns HTTP 200 when ready, or HTTP 503 when degraded.',
  })
  @ApiResponse({
    status: 200,
    description: 'System dependencies are healthy and ready to serve traffic',
  })
  @ApiResponse({
    status: 503,
    description: 'System health is degraded (e.g. database down)',
  })
  async checkReadiness(
    @Res({ passthrough: true }) res: Response,
  ): Promise<HealthReadinessResponse> {
    const result = await this.healthService.checkReadiness();
    if (result.status !== 'ok') {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return result;
  }

  @Get()
  @ApiOperation({
    summary: 'Check API and system health status (legacy alias for readiness)',
    description:
      'Maintained for full backward compatibility with Dockerfiles, Railway healthchecks, and staging smoke tests.',
  })
  @ApiResponse({
    status: 200,
    description: 'System is fully operational and healthy',
  })
  @ApiResponse({
    status: 503,
    description: 'System health is degraded (e.g. database down)',
  })
  async check(
    @Res({ passthrough: true }) res: Response,
  ): Promise<HealthCheckResponse> {
    const result = await this.healthService.check();
    if (result.status !== 'ok') {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return result;
  }
}
