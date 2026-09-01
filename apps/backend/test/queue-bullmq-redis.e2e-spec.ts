import Redis from 'ioredis';
import { Queue, Worker, Job } from 'bullmq';

describe('BullMQ & Redis Real Integration Test', () => {
  let redisClient: Redis;
  let testQueue: Queue;
  let testWorker: Worker;
  let isRedisAvailable = false;

  const testQueueName = `ops-probe-e2e-${Date.now()}`;

  beforeAll(async () => {
    const redisHost = process.env.REDIS_HOST || '127.0.0.1';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
    const redisPassword = process.env.REDIS_PASSWORD || undefined;

    redisClient = new Redis({
      host: redisHost,
      port: redisPort,
      password: redisPassword,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      lazyConnect: true,
    });

    try {
      await redisClient.connect();
      await redisClient.ping();
      isRedisAvailable = true;
    } catch {
      isRedisAvailable = false;
    }
  });

  afterAll(async () => {
    if (testWorker) {
      await testWorker.close();
    }
    if (testQueue) {
      await testQueue.obliterate({ force: true }).catch(() => {});
      await testQueue.close();
    }
    if (redisClient && redisClient.status === 'ready') {
      await redisClient.quit();
    }
  });

  it('should connect to real Redis, enqueue job, execute in worker, and verify completion', async () => {
    if (!isRedisAvailable) {
      // In local environments without Redis running, skip gracefully with warning
      console.warn(
        'Real Redis is not available on localhost:6379, skipping live Redis e2e test',
      );
      return;
    }

    testQueue = new Queue(testQueueName, {
      connection: redisClient as any,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'fixed', delay: 100 },
        removeOnComplete: true,
      },
    });

    const processedJobs: any[] = [];
    testWorker = new Worker(
      testQueueName,
      async (job: Job) => {
        processedJobs.push({
          id: job.id,
          data: job.data,
          attempt: job.attemptsMade,
        });
        return { success: true, processedAt: new Date().toISOString() };
      },
      { connection: redisClient as any },
    );

    // Enqueue real job
    const job = await testQueue.add('test-probe-job', {
      probeId: 'real-redis-probe-1',
      timestamp: new Date().toISOString(),
    });

    expect(job.id).toBeDefined();

    // Wait for worker to process job
    let completed = false;
    for (let i = 0; i < 20; i++) {
      const state = await job.getState();
      if (state === 'completed') {
        completed = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    expect(completed).toBe(true);
    expect(processedJobs.length).toBe(1);
    expect(processedJobs[0].data.probeId).toBe('real-redis-probe-1');
  });

  it('should test retry backoff on failure in real BullMQ queue', async () => {
    if (!isRedisAvailable || !testQueue) {
      return;
    }

    let attemptsCount = 0;
    const retryWorkerName = `ops-retry-${Date.now()}`;
    const retryQueue = new Queue(retryWorkerName, {
      connection: redisClient as any,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'fixed', delay: 100 },
      },
    });

    const retryWorker = new Worker(
      retryWorkerName,
      async () => {
        attemptsCount++;
        if (attemptsCount === 1) {
          throw new Error('Simulated transient failure for retry verification');
        }
        return { success: true, recoveredOnAttempt: attemptsCount };
      },
      { connection: redisClient as any },
    );

    const job = await retryQueue.add('test-retry-job', { test: true });

    let completed = false;
    for (let i = 0; i < 30; i++) {
      const state = await job.getState();
      if (state === 'completed') {
        completed = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    expect(completed).toBe(true);
    expect(attemptsCount).toBe(2);

    await retryWorker.close();
    await retryQueue.obliterate({ force: true }).catch(() => {});
    await retryQueue.close();
  });
});
