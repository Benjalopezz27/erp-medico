import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // CORS configuration
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  // Swagger OpenAPI Documentation
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

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`🚀 ERP Backend running on: http://localhost:${port}/api/v1`);
  logger.log(`📚 Swagger Documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
