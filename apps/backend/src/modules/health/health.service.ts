import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface HealthCheckResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  commitSha: string;
  services: {
    database: 'up' | 'down';
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly dataSource: DataSource) {}

  async check(): Promise<HealthCheckResponse> {
    const dbStatus = await this.checkDatabase();

    return {
      status: dbStatus === 'up' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      version:
        process.env.APP_VERSION || process.env.npm_package_version || '0.1.0',
      commitSha: process.env.APP_COMMIT_SHA || 'development',
      services: {
        database: dbStatus,
      },
    };
  }

  private async checkDatabase(): Promise<'up' | 'down'> {
    try {
      if (!this.dataSource || !this.dataSource.isInitialized) {
        return 'down';
      }
      await this.dataSource.query('SELECT 1');
      return 'up';
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return 'down';
    }
  }
}
