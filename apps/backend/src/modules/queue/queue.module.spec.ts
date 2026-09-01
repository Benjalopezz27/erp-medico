import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { QueueModule } from './queue.module';
import { OpsProbeQueueService } from './services/ops-probe.queue';
import { OpsProbeProcessor } from './processors/ops-probe.processor';
import { REDIS_CONNECTION } from './queue.constants';

jest.mock('ioredis', () => {
  const mockRedis = jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    disconnect: jest.fn(),
    quit: jest.fn(),
  }));
  return {
    __esModule: true,
    default: mockRedis,
    Redis: mockRedis,
  };
});

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    add: jest.fn(),
    close: jest.fn(),
  })),
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn(),
  })),
}));

describe('QueueModule (Integration)', () => {
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              REDIS_HOST: 'localhost',
              REDIS_PORT: 6379,
            }),
          ],
        }),
        QueueModule,
      ],
    }).compile();
  });

  afterEach(async () => {
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  it('compiles and exports OpsProbeQueueService and OpsProbeProcessor', () => {
    const queueService =
      moduleRef.get<OpsProbeQueueService>(OpsProbeQueueService);
    const processor = moduleRef.get<OpsProbeProcessor>(OpsProbeProcessor);
    const redis = moduleRef.get(REDIS_CONNECTION);

    expect(queueService).toBeDefined();
    expect(processor).toBeDefined();
    expect(redis).toBeDefined();
  });
});
