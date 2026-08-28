import { AllExceptionsFilter } from './all-exceptions.filter';
import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  ArgumentsHost,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { RequestContextService } from '../services/request-context.service';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockResponse: Partial<Response>;
  let mockRequest: Partial<Request>;
  let mockHost: ArgumentsHost;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let setHeaderMock: jest.Mock;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    setHeaderMock = jest.fn();

    mockResponse = {
      status: statusMock,
      setHeader: setHeaderMock,
    };

    mockRequest = {
      headers: { 'x-request-id': 'custom-req-id' },
      url: '/api/v1/auth/login?redirect=true',
    };

    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse as Response,
        getRequest: () => mockRequest as Request,
      }),
    } as unknown as ArgumentsHost;
  });

  it('formats BadRequestException preserving string message and appending requestId', () => {
    RequestContextService.run({ requestId: 'context-req-id' }, () => {
      const exception = new BadRequestException('Invalid credentials');
      filter.catch(exception, mockHost);

      expect(setHeaderMock).toHaveBeenCalledWith(
        'X-Request-ID',
        'context-req-id',
      );
      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Invalid credentials',
          error: 'Bad Request',
          requestId: 'context-req-id',
          path: '/api/v1/auth/login',
          timestamp: expect.any(String),
        }),
      );
    });
  });

  it('preserves array of validation messages from class-validator', () => {
    const exception = new BadRequestException({
      message: ['name must be a string', 'cost must be positive'],
      error: 'Bad Request',
    });

    filter.catch(exception, mockHost);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: ['name must be a string', 'cost must be positive'],
        error: 'Bad Request',
        requestId: 'custom-req-id',
      }),
    );
  });

  it('preserves domain error codes from custom exceptions', () => {
    const exception = new ConflictException({
      code: 'PURCHASE_ORDER_CANNOT_EDIT_NON_DRAFT',
      message: 'Only drafts can be edited',
    });

    filter.catch(exception, mockHost);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 409,
        code: 'PURCHASE_ORDER_CANNOT_EDIT_NON_DRAFT',
        message: 'Only drafts can be edited',
      }),
    );
  });

  it('preserves sanitized recovery details from domain exceptions', () => {
    const exception = new ConflictException({
      code: 'PRICE_REVIEW_STALE',
      message: 'The review is stale',
      details: {
        currentReview: { id: 'review-id', status: 'PENDIENTE' },
        authorization: 'Bearer secret.payload.signature',
      },
    });

    filter.catch(exception, mockHost);

    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'PRICE_REVIEW_STALE',
        details: {
          currentReview: { id: 'review-id', status: 'PENDIENTE' },
          authorization: '[REDACTED]',
        },
      }),
    );
  });

  it('handles unhandled Error without leaking stack trace to response', () => {
    const error = new Error('Database connection pool timeout');

    filter.catch(error, mockHost);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error',
        requestId: 'custom-req-id',
      }),
    );
  });
});
