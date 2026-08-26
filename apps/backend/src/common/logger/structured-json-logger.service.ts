import { LoggerService, Injectable } from '@nestjs/common';
import { RequestContextService } from '../services/request-context.service';
import { redactSecrets } from '../utils/sanitizer.utils';

export interface ILogEntry {
  timestamp: string;
  level: string;
  context: string;
  message: string | unknown;
  requestId?: string;
  userId?: string;
  environment: string;
  version: string;
  commitSha: string;
  stack?: string;
}

@Injectable()
export class StructuredJsonLogger implements LoggerService {
  private formatEntry(
    level: string,
    message: any,
    context?: string,
    stack?: string,
  ): string {
    const ctx = RequestContextService.get();

    const entry: ILogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: context || 'Application',
      message:
        typeof message === 'string'
          ? redactSecrets(message)
          : redactSecrets(message),
      requestId: ctx?.requestId,
      userId: ctx?.userId,
      environment: process.env.NODE_ENV || 'development',
      version:
        process.env.APP_VERSION || process.env.npm_package_version || '0.1.0',
      commitSha:
        process.env.APP_COMMIT_SHA ||
        process.env.RAILWAY_GIT_COMMIT_SHA ||
        'development',
      ...(stack ? { stack: redactSecrets(stack) } : {}),
    };

    return JSON.stringify(entry) + '\n';
  }

  log(message: any, context?: string): void {
    process.stdout.write(this.formatEntry('info', message, context));
  }

  error(message: any, stack?: string, context?: string): void {
    process.stderr.write(this.formatEntry('error', message, context, stack));
  }

  warn(message: any, context?: string): void {
    process.stdout.write(this.formatEntry('warn', message, context));
  }

  debug(message: any, context?: string): void {
    process.stdout.write(this.formatEntry('debug', message, context));
  }

  verbose(message: any, context?: string): void {
    process.stdout.write(this.formatEntry('verbose', message, context));
  }
}
