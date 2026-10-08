import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as path from 'path';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USER', 'erp_user'),
        password:
          process.env.NODE_ENV === 'production'
            ? configService.getOrThrow<string>('DB_PASSWORD')
            : configService.get<string>('DB_PASSWORD', 'erp_password_dev'),
        database: configService.get<string>('DB_NAME', 'erp_medico'),
        autoLoadEntities: true,
        // Explicit glob (in addition to autoLoadEntities) so partial app
        // contexts that don't import every feature module — like the
        // worker process — still get the full entity relation graph
        // TypeORM needs to validate metadata, without hand-listing modules.
        entities: [path.resolve(__dirname, '../modules/**/*.entity{.ts,.js}')],
        migrations: [path.resolve(__dirname, './migrations/*{.ts,.js}')],
        // Workers hold a connection for the whole ARCA round-trip (up to ~30 s
        // x concurrency 5); the pg default of 10 leaves little room for the rest.
        extra: { max: Number(configService.get('DB_POOL_MAX', 20)) },
        synchronize: false,
        logging: configService.get<string>('NODE_ENV') === 'development',
      }),
    }),
  ],
})
export class DatabaseModule {}
