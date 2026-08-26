import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { RequestContextService } from '../services/request-context.service';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpCtx = context.switchToHttp();
    const req = httpCtx.getRequest<Request>();
    const res = httpCtx.getResponse<Response>();

    const startTime = Date.now();
    const method = req.method;
    const url = (req.originalUrl || req.url || '').split('?')[0];

    // Capture authenticated user if available
    if ((req as any).user) {
      RequestContextService.setUser(
        (req as any).user.id,
        (req as any).user.role,
      );
    }

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - startTime;
          const statusCode = res.statusCode;

          // Skip successful healthcheck noise in production logs
          if (
            (url === '/api/v1/health' ||
              url === '/api/v1/health/live' ||
              url === '/api/v1/health/ready') &&
            statusCode === 200
          ) {
            return;
          }

          this.logger.log({
            type: 'HTTP_REQUEST',
            method,
            route: url,
            statusCode,
            durationMs,
          });
        },
        error: () => {
          const durationMs = Date.now() - startTime;
          const statusCode = res.statusCode || 500;

          this.logger.error({
            type: 'HTTP_REQUEST_ERROR',
            method,
            route: url,
            statusCode,
            durationMs,
          });
        },
      }),
    );
  }
}
