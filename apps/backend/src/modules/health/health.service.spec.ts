import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;
  let dataSource: Partial<DataSource>;

  beforeEach(async () => {
    dataSource = {
      isInitialized: true,
      query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return status "ok" and database "up" when database is reachable', async () => {
    const result = await service.check();

    expect(result.status).toBe('ok');
    expect(result.services.database).toBe('up');
    expect(result).toHaveProperty('timestamp');
    expect(result).toHaveProperty('uptime');
    expect(result).toHaveProperty('environment');
    expect(result).toHaveProperty('version');
    expect(result).toHaveProperty('commitSha');
    expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
  });

  it('should use APP_VERSION and APP_COMMIT_SHA environment variables when set', async () => {
    const originalVersion = process.env.APP_VERSION;
    const originalSha = process.env.APP_COMMIT_SHA;

    process.env.APP_VERSION = '1.2.3';
    process.env.APP_COMMIT_SHA = 'abcdef123456';

    const result = await service.check();

    expect(result.version).toBe('1.2.3');
    expect(result.commitSha).toBe('abcdef123456');

    process.env.APP_VERSION = originalVersion;
    process.env.APP_COMMIT_SHA = originalSha;
  });

  it('should return status "degraded" and database "down" when database query fails', async () => {
    (dataSource.query as jest.Mock).mockRejectedValueOnce(
      new Error('DB Connection Timeout'),
    );

    const result = await service.check();

    expect(result.status).toBe('degraded');
    expect(result.services.database).toBe('down');
  });

  it('should return status "degraded" and database "down" if datasource is not initialized', async () => {
    (dataSource as any).isInitialized = false;

    const result = await service.check();

    expect(result.status).toBe('degraded');
    expect(result.services.database).toBe('down');
  });
});
