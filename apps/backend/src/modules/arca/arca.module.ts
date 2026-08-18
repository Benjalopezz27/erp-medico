import { Module } from '@nestjs/common';
import { ArcaController } from './arca.controller';
import { ArcaService } from './arca.service';
import { arcaServiceProvider } from './arca.provider';
import { ARCA_SERVICE } from './arca.constants';

@Module({
  controllers: [ArcaController],
  providers: [ArcaService, arcaServiceProvider],
  exports: [ArcaService, ARCA_SERVICE],
})
export class ArcaModule {}
