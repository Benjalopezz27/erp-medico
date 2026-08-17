import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthCheckResponse, HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check API and system health status',
    description:
      'Returns the current operational status, uptime, environment, and database connectivity.',
  })
  @ApiResponse({
    status: 200,
    description: 'System health report',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2026-08-17T16:40:00.000Z' },
        uptime: { type: 'number', example: 120 },
        environment: { type: 'string', example: 'development' },
        version: { type: 'string', example: '0.1.0' },
        services: {
          type: 'object',
          properties: {
            database: { type: 'string', example: 'up' },
          },
        },
      },
    },
  })
  async check(): Promise<HealthCheckResponse> {
    return this.healthService.check();
  }
}
