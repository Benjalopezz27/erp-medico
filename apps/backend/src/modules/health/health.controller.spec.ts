import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { HealthController } from './health.controller';
import { HealthCheckResponse, HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let service: HealthService;

  const mockHealthResponse: HealthCheckResponse = {
    status: 'ok',
    timestamp: '2026-08-17T16:40:00.000Z',
    uptime: 100,
    environment: 'test',
    version: '0.1.0',
    commitSha: 'test-sha-123',
    services: {
      database: 'up',
    },
  };

  const createMockResponse = (): Partial<Response> => ({
    status: jest.fn().mockReturnThis(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: {
            check: jest.fn().mockResolvedValue(mockHealthResponse),
            checkReadiness: jest.fn().mockResolvedValue(mockHealthResponse),
            checkLiveness: jest.fn().mockReturnValue({
              status: 'ok',
              timestamp: '2026-08-17T16:40:00.000Z',
              uptime: 100,
              environment: 'test',
              version: '0.1.0',
              commitSha: 'test-sha-123',
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    service = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return liveness response synchronously without querying DB', () => {
    const result = controller.checkLiveness();
    expect(result.status).toBe('ok');
    expect(service.checkLiveness).toHaveBeenCalledTimes(1);
  });

  it('should return readiness response with status ok', async () => {
    const mockRes = createMockResponse();
    const result = await controller.checkReadiness(mockRes as Response);
    expect(result).toEqual(mockHealthResponse);
    expect(service.checkReadiness).toHaveBeenCalledTimes(1);
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('should return health check response from HealthService with status ok on legacy endpoint', async () => {
    const mockRes = createMockResponse();
    const result = await controller.check(mockRes as Response);
    expect(result).toEqual(mockHealthResponse);
    expect(service.check).toHaveBeenCalledTimes(1);
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('should set HTTP 503 when health status is degraded on readiness check', async () => {
    const degradedResponse: HealthCheckResponse = {
      ...mockHealthResponse,
      status: 'degraded',
      services: { database: 'down' },
    };
    (service.checkReadiness as jest.Mock).mockResolvedValueOnce(
      degradedResponse,
    );

    const mockRes = createMockResponse();
    const result = await controller.checkReadiness(mockRes as Response);

    expect(result.status).toBe('degraded');
    expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
  });
});
