import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { StructuredJsonLogger } from './common/logger/structured-json-logger.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const jsonLogger = new StructuredJsonLogger();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
    logger: jsonLogger,
  });

  // Explicit body parsers with 1MB ceiling to enforce 413 Payload Too Large
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ limit: '1mb', extended: true }));

  // Reverse proxy IP resolution
  const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? 1);
  app.set('trust proxy', trustProxyHops);

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Global exception filter with Request ID correlation
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Graceful shutdown hooks for SIGTERM / SIGINT
  app.enableShutdownHooks();

  // Helmet Security Headers with Swagger-compatible CSP
  const swaggerEnabled =
    process.env.SWAGGER_ENABLED === 'true' ||
    (process.env.NODE_ENV !== 'production' &&
      process.env.SWAGGER_ENABLED !== 'false');

  app.use(
    helmet({
      contentSecurityPolicy: swaggerEnabled
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'", "'unsafe-inline'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'validator.swagger.io'],
            },
          }
        : undefined,
    }),
  );

  // CORS configuration with multi-origin allow-list
  const rawAllowedOrigins =
    process.env.CORS_ALLOWED_ORIGINS ||
    process.env.FRONTEND_URL ||
    'http://localhost:5173';
  const allowedOrigins = rawAllowedOrigins
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);

  app.enableCors({
    origin: (requestOrigin, callback) => {
      // Allow non-browser requests without origin header (e.g. server-to-server, curls)
      if (!requestOrigin) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(requestOrigin)) {
        return callback(null, true);
      }
      // Unlisted origin: standard CORS behavior (do not reflect origin)
      return callback(null, false);
    },
    credentials: true,
    exposedHeaders: ['X-Request-ID'],
  });

  // Swagger OpenAPI Documentation (toggleable)
  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('ERP Distribuidora Médica API')
      .setDescription(
        'API documentation for Medical Supply Distributor ERP (Argentina)',
      )
      .setVersion('1.0.0')
      .addBearerAuth()
      .addTag('health', 'System health check and database diagnostics')
      .addTag('auth', 'Authentication and session management')
      .addTag('users', 'User administration and immutable audit log')
      .addTag('products', 'Product catalog and unit conversions')
      .addTag('stock', 'Transactional immutable stock ledger')
      .addTag('suppliers', 'Supplier management and catalog mapping')
      .addTag('importer', 'Dynamic column mapping and bulk import')
      .addTag('purchases', 'Purchase orders and goods receipt')
      .addTag('costs', 'Provisional vs real cost reconciliation')
      .addTag('prices', 'Markup hierarchy and price reviews')
      .addTag('customers', 'Customer accounts and special pricing')
      .addTag('sales', 'Point of sale and fiscal invoicing')
      .addTag('arca', 'ARCA / AFIP electronic invoice integration')
      .addTag('receivables', 'Accounts receivable and credit sales')
      .addTag('payments', 'Payment collections and receipt generation')
      .addTag('checks', 'Third-party check lifecycle management')
      .addTag('treasury', 'Cash registers, bank accounts, and liquidity')
      .addTag('reports', 'Operational and financial reports')
      .addTag('system-config', 'Global system parameters and settings')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  jsonLogger.log(
    `ERP Backend running on: http://localhost:${port}/api/v1 (Swagger: ${swaggerEnabled ? 'enabled' : 'disabled'})`,
    'Bootstrap',
  );
}

bootstrap();
