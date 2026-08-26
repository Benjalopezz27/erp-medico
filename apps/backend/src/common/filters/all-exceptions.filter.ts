import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { RequestContextService } from '../services/request-context.service';
import { redactSecrets } from '../utils/sanitizer.utils';

const HTTP_STATUS_NAMES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  413: 'Payload Too Large',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId =
      RequestContextService.getRequestId() ||
      (request.headers['x-request-id'] as string) ||
      'unknown';

    // Ensure header is set on the response
    response.setHeader('X-Request-ID', requestId);

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let errorName: string | undefined;
    let errorCode: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, any>;
        message = resObj.message ?? message;
        errorName = resObj.error;
        errorCode = resObj.code;
      }
    } else {
      const anyErr = exception as Record<string, any>;
      if (
        typeof anyErr?.status === 'number' &&
        anyErr.status >= 400 &&
        anyErr.status < 600
      ) {
        status = anyErr.status;
        message = anyErr.message || message;
        errorName =
          anyErr.type === 'entity.too.large'
            ? 'Payload Too Large'
            : anyErr.name;
      } else if (
        typeof anyErr?.statusCode === 'number' &&
        anyErr.statusCode >= 400 &&
        anyErr.statusCode < 600
      ) {
        status = anyErr.statusCode;
        message = anyErr.message || message;
        errorName =
          anyErr.type === 'entity.too.large'
            ? 'Payload Too Large'
            : anyErr.name;
      } else {
        // Unhandled 500 Error: Log sanitized stack trace internally
        const err =
          exception instanceof Error ? exception : new Error(String(exception));
        this.logger.error(
          `Unhandled exception: ${err.message}`,
          err.stack ? redactSecrets(err.stack) : undefined,
        );
      }
    }

    if (!errorName) {
      errorName =
        HTTP_STATUS_NAMES[status] ||
        (status >= 500 ? 'Internal Server Error' : 'Error');
    }

    const errorPayload: Record<string, any> = {
      statusCode: status,
      message,
      error: errorName,
      ...(errorCode ? { code: errorCode } : {}),
      requestId,
      timestamp: new Date().toISOString(),
      path: (request.originalUrl || request.url || '').split('?')[0],
    };

    response.status(status).json(errorPayload);
  }
}
