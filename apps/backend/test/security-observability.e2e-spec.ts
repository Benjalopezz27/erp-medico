import { Test, TestingModule } from '@nestjs/testing';
import { Controller, Get, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import * as request from 'supertest';
import * as express from 'express';
import helmet from 'helmet';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import dataSource from '../src/database/data-source';

@Controller('test-throttling')
class TestThrottlingController {
  @Get('limited')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  getLimited() {
    return { status: 'limited-ok' };
  }
}

describe('Operational Security & Observability (E2E)', () => {
  let app: NestExpressApplication;
  let ds: DataSource;

  beforeAll(async () => {
    process.env.JWT_SECRET =
      process.env.JWT_SECRET ||
      'test_ci_jwt_secret_key_minimum_32_characters_long!';
    process.env.JWT_EXPIRATION = process.env.JWT_EXPIRATION || '8h';
    process.env.CORS_ALLOWED_ORIGINS =
      'https://app.erp-medico.com,https://admin.erp-medico.com';

    ds = await dataSource.initialize();
    await ds.runMigrations();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [TestThrottlingController],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>(
      undefined,
      { bodyParser: false },
    );

    app.set('trust proxy', 1);

    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ limit: '1mb', extended: true }));

    app.setGlobalPrefix('api/v1');

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    app.use(helmet());

    const rawAllowedOrigins =
      process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173';
    const allowedOrigins = rawAllowedOrigins
      .split(',')
      .map((o) => o.trim())
      .filter((o) => o.length > 0);

    app.enableCors({
      origin: (requestOrigin, callback) => {
        if (!requestOrigin || allowedOrigins.includes(requestOrigin)) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: true,
      exposedHeaders: ['X-Request-ID'],
    });

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (ds && ds.isInitialized) {
      await ds.destroy();
    }
  });

  describe('1. Distributed Request / Correlation ID (X-Request-ID)', () => {
    it('preserves client-provided valid X-Request-ID in response headers and error payload', async () => {
      const customTraceId = 'trace-id-abc-12345';

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('X-Request-ID', customTraceId)
        .send({ email: 'notanemail' }); // triggers 400 Bad Request

      expect(response.status).toBe(400);
      expect(response.headers['x-request-id']).toBe(customTraceId);
      expect(response.body.requestId).toBe(customTraceId);
      expect(response.body.statusCode).toBe(400);
      expect(response.body.timestamp).toBeDefined();
    });

    it('generates a UUID when X-Request-ID header is omitted', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/health/live',
      );

      expect(response.status).toBe(200);
      const returnedId = response.headers['x-request-id'];
      expect(returnedId).toBeDefined();
      expect(returnedId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });
  });

  describe('2. Decoupled Health Probes & Backward Compatibility', () => {
    it('GET /api/v1/health/live returns HTTP 200 with uptime and version metadata', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/health/live',
      );

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.uptime).toBeDefined();
      expect(response.body.environment).toBeDefined();
      expect(response.body.version).toBeDefined();
      expect(response.body.commitSha).toBeDefined();
      expect(response.body.services).toBeUndefined();
    });

    it('GET /api/v1/health/ready returns HTTP 200 with database status up', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/health/ready',
      );

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.services?.database).toBe('up');
    });

    it('GET /api/v1/health acts as a backward-compatible alias for readiness', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.services?.database).toBe('up');
    });
  });

  describe('3. Security Headers (Helmet)', () => {
    it('includes standard security headers in HTTP responses', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/health/live',
      );

      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });
  });

  describe('4. CORS Allow-List & Non-Reflecting Rejection', () => {
    it('allows origin present in CORS_ALLOWED_ORIGINS and returns Access-Control-Allow-Origin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health/live')
        .set('Origin', 'https://app.erp-medico.com');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe(
        'https://app.erp-medico.com',
      );
      expect(response.headers['access-control-allow-credentials']).toBe('true');
      expect(response.headers['access-control-expose-headers']).toContain(
        'X-Request-ID',
      );
    });

    it('does NOT reflect origin for unauthorized domains without throwing a 500 error', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health/live')
        .set('Origin', 'https://evil-attacker.com');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('5. Body Parser 1MB Ceiling & 413 Payload Too Large', () => {
    it('returns HTTP 413 when JSON payload exceeds 1MB', async () => {
      // Create a 1.2MB payload
      const hugeString = 'A'.repeat(1.2 * 1024 * 1024);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('Content-Type', 'application/json')
        .send(`{"email":"admin@erp.com","password":"${hugeString}"}`);

      expect(response.status).toBe(413);
      expect(response.body.statusCode).toBe(413);
      expect(response.body.requestId).toBeDefined();
    });
  });

  describe('6. In-Memory Rate Limiting (@nestjs/throttler)', () => {
    it('enforces limit on endpoint from the same IP, returning HTTP 429 after exceeding limit', async () => {
      const clientIp = '203.0.113.55';

      // 3 allowed attempts
      for (let i = 0; i < 3; i++) {
        const res = await request(app.getHttpServer())
          .get('/api/v1/test-throttling/limited')
          .set('X-Forwarded-For', clientIp);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('limited-ok');
      }

      // 4th attempt should be blocked with 429
      const blockedRes = await request(app.getHttpServer())
        .get('/api/v1/test-throttling/limited')
        .set('X-Forwarded-For', clientIp);

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body.statusCode).toBe(429);
      expect(blockedRes.body.error).toBe('Too Many Requests');
      expect(blockedRes.body.requestId).toBeDefined();
    });

    it('does not block requests from a different client IP', async () => {
      const differentIp = '198.51.100.99';

      const res = await request(app.getHttpServer())
        .get('/api/v1/test-throttling/limited')
        .set('X-Forwarded-For', differentIp);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('limited-ok');
    });

    it('does NOT throttle health check endpoints (@SkipThrottle)', async () => {
      const pollingIp = '203.0.113.88';

      for (let i = 0; i < 10; i++) {
        const res = await request(app.getHttpServer())
          .get('/api/v1/health/live')
          .set('X-Forwarded-For', pollingIp);

        expect(res.status).toBe(200);
      }
    });
  });
});
