import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { ArcaModule } from './arca.module';
import { ArcaController } from './arca.controller';
import { ArcaService } from './arca.service';
import { ARCA_SERVICE } from './arca.constants';
import { ArcaMockService } from './arca-mock.service';
import { IArcaService } from './interfaces/arca-service.interface';

describe('ArcaModule (Integration)', () => {
  const originalEnv = process.env;
  let moduleRef: TestingModule;

  beforeEach(async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      ARCA_ENV: 'development',
    };

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              NODE_ENV: 'test',
              ARCA_ENV: 'development',
            }),
          ],
        }),
        ArcaModule,
      ],
    }).compile();
  });

  afterEach(async () => {
    process.env = originalEnv;
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  it('should compile ArcaModule and resolve ArcaService, ArcaController and ARCA_SERVICE', () => {
    const controller = moduleRef.get<ArcaController>(ArcaController);
    const service = moduleRef.get<ArcaService>(ArcaService);
    const arcaService = moduleRef.get<IArcaService>(ARCA_SERVICE);

    expect(controller).toBeDefined();
    expect(service).toBeDefined();
    expect(arcaService).toBeDefined();
    expect(arcaService).toBeInstanceOf(ArcaMockService);
  });

  it('should return operational module status from controller', () => {
    const controller = moduleRef.get<ArcaController>(ArcaController);
    expect(controller.getStatus()).toEqual({
      module: 'arca',
      status: 'initialized',
    });
  });
});
