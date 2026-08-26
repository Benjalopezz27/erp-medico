import { HttpLoggingInterceptor } from './http-logging.interceptor';
import { ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { RequestContextService } from '../services/request-context.service';

describe('HttpLoggingInterceptor', () => {
  let interceptor: HttpLoggingInterceptor;
  let loggerLogSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    interceptor = new HttpLoggingInterceptor();
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    loggerLogSpy.mockRestore();
    loggerErrorSpy.mockRestore();
  });

  it('logs HTTP request and response duration', (done) => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          originalUrl: '/api/v1/products?search=gasa',
          user: { id: 'usr-123', role: 'ADMINISTRADOR' },
        }),
        getResponse: () => ({
          statusCode: 200,
        }),
      }),
    } as unknown as ExecutionContext;

    const mockHandler: CallHandler = {
      handle: () => of({ data: [] }),
    };

    RequestContextService.run({ requestId: 'test-req-1' }, () => {
      interceptor.intercept(mockContext, mockHandler).subscribe({
        next: () => {
          expect(loggerLogSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              type: 'HTTP_REQUEST',
              method: 'GET',
              route: '/api/v1/products',
              statusCode: 200,
            }),
          );
          expect(RequestContextService.get()?.userId).toBe('usr-123');
          done();
        },
      });
    });
  });

  it('skips logging successful /health checks', (done) => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          originalUrl: '/api/v1/health/live',
        }),
        getResponse: () => ({
          statusCode: 200,
        }),
      }),
    } as unknown as ExecutionContext;

    const mockHandler: CallHandler = {
      handle: () => of({ status: 'ok' }),
    };

    interceptor.intercept(mockContext, mockHandler).subscribe({
      next: () => {
        expect(loggerLogSpy).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('logs error on request failure', (done) => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'POST',
          originalUrl: '/api/v1/auth/login',
        }),
        getResponse: () => ({
          statusCode: 401,
        }),
      }),
    } as unknown as ExecutionContext;

    const mockHandler: CallHandler = {
      handle: () => throwError(() => new Error('Unauthorized')),
    };

    interceptor.intercept(mockContext, mockHandler).subscribe({
      error: () => {
        expect(loggerErrorSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'HTTP_REQUEST_ERROR',
            method: 'POST',
            route: '/api/v1/auth/login',
          }),
        );
        done();
      },
    });
  });
});
