import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { HealthCheckResponse, HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Check API and system health status',
    description:
      'Returns the current operational status, uptime, environment, commit SHA, and database connectivity. Returns HTTP 200 when operational, or HTTP 503 when degraded.',
  })
  @ApiResponse({
    status: 200,
    description: 'System is fully operational and healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2026-08-17T16:40:00.000Z' },
        uptime: { type: 'number', example: 120 },
        environment: { type: 'string', example: 'development' },
        version: { type: 'string', example: '0.1.0' },
        commitSha: { type: 'string', example: '3575c1a' },
        services: {
          type: 'object',
          properties: {
            database: { type: 'string', example: 'up' },
          },
        },
      },
    },
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
