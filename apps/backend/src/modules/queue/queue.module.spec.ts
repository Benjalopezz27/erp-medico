import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { QueueProducerModule } from './queue-producer.module';
import { QueueConsumerModule } from './queue-consumer.module';
import { OpsProbeQueueService } from './services/ops-probe.queue';
import { OpsProbeProcessor } from './processors/ops-probe.processor';
import { REDIS_CONNECTION } from './queue.constants';

jest.mock('ioredis', () => {
  const mockRedis = jest.fn().mockImplementation(() => ({
    status: 'ready',
    on: jest.fn(),
    quit: jest.fn().mockResolvedValue('OK'),
  }));
  return {
    __esModule: true,
    default: mockRedis,
    Redis: mockRedis,
  };
});

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    close: jest.fn(),
  })),
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn(),
  })),
}));

describe('QueueProducerModule (Backend API)', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), QueueProducerModule],
    }).compile();
  });

  it('should provide Redis connection and OpsProbeQueueService', () => {
    expect(module.get(REDIS_CONNECTION)).toBeDefined();
    expect(module.get(OpsProbeQueueService)).toBeDefined();
  });

  it('should NOT instantiate OpsProbeProcessor in producer module', () => {
    expect(() => module.get(OpsProbeProcessor)).toThrow();
  });
});

describe('QueueConsumerModule (Worker Process)', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), QueueConsumerModule],
    }).compile();
  });

  it('should instantiate OpsProbeProcessor in consumer module', () => {
    expect(module.get(OpsProbeProcessor)).toBeDefined();
  });
});
