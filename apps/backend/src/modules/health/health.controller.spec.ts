import { Test, TestingModule } from '@nestjs/testing';
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
    services: {
      database: 'up',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: {
            check: jest.fn().mockResolvedValue(mockHealthResponse),
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

  it('should return health check response from HealthService', async () => {
    const result = await controller.check();
    expect(result).toEqual(mockHealthResponse);
    expect(service.check).toHaveBeenCalledTimes(1);
  });
});
