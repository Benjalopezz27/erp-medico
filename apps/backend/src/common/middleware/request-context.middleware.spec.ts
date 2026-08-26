import { RequestContextMiddleware } from './request-context.middleware';
import { RequestContextService } from '../services/request-context.service';
import { Request, Response, NextFunction } from 'express';

describe('RequestContextMiddleware', () => {
  let middleware: RequestContextMiddleware;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    middleware = new RequestContextMiddleware();
    mockReq = {
      headers: {},
      method: 'GET',
      url: '/api/v1/products',
      socket: { remoteAddress: '127.0.0.1' } as any,
    };
    mockRes = {
      setHeader: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  it('preserves a valid incoming X-Request-ID and sets it on response', () => {
    mockReq.headers = { 'x-request-id': 'valid-trace-id-123' };

    middleware.use(mockReq as Request, mockRes as Response, () => {
      expect(RequestContextService.getRequestId()).toBe('valid-trace-id-123');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'X-Request-ID',
        'valid-trace-id-123',
      );
      nextFunction();
    });

    expect(nextFunction).toHaveBeenCalled();
  });

  it('generates a new UUID if X-Request-ID is missing', () => {
    mockReq.headers = {};

    middleware.use(mockReq as Request, mockRes as Response, () => {
      const id = RequestContextService.getRequestId();
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-ID', id);
      nextFunction();
    });

    expect(nextFunction).toHaveBeenCalled();
  });

  it('replaces an invalid X-Request-ID with a valid UUID', () => {
    mockReq.headers = { 'x-request-id': 'invalid header with spaces and <>' };

    middleware.use(mockReq as Request, mockRes as Response, () => {
      const id = RequestContextService.getRequestId();
      expect(id).not.toBe('invalid header with spaces and <>');
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      nextFunction();
    });

    expect(nextFunction).toHaveBeenCalled();
  });
});
