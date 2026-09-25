import { Global, Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { QueueProducerModule } from './queue-producer.module';
import { QueueConsumerModule } from './queue-consumer.module';
import { OpsProbeQueueService } from './services/ops-probe.queue';
import { OpsProbeProcessor } from './processors/ops-probe.processor';
import { REDIS_CONNECTION } from './queue.constants';
import { FiscalDocument } from '../sales/entities/fiscal-document.entity';
import { Sale } from '../sales/entities/sale.entity';
import { SaleItem } from '../sales/entities/sale-item.entity';
import { SaleReturnItem } from '../sales/returns/entities/sale-return-item.entity';
import { Customer } from '../customers/entities/customer.entity';

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

@Global()
@Module({
  providers: [
    {
      provide: DataSource,
      useValue: { manager: {}, getRepository: jest.fn() },
    },
  ],
  exports: [DataSource],
})
class MockDatabaseModule {}

describe('QueueConsumerModule (Worker Process)', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        MockDatabaseModule,
        QueueConsumerModule,
      ],
    })
      .overrideProvider(getRepositoryToken(FiscalDocument))
      .useValue({})
      .overrideProvider(getRepositoryToken(Sale))
      .useValue({})
      .overrideProvider(getRepositoryToken(SaleItem))
      .useValue({})
      .overrideProvider(getRepositoryToken(SaleReturnItem))
      .useValue({})
      .overrideProvider(getRepositoryToken(Customer))
      .useValue({})
      .compile();
  });

  it('should instantiate OpsProbeProcessor in consumer module', () => {
    expect(module.get(OpsProbeProcessor)).toBeDefined();
  });
});
