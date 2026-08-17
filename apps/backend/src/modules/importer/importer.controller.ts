import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ImporterService } from './importer.service';

@ApiTags('importer')
@Controller('importer')
export class ImporterController {
  constructor(private readonly importerService: ImporterService) {}

  @Get('status')
  @ApiOperation({ summary: 'Check Importer module status' })
  @ApiResponse({ status: 200, description: 'Importer module operational' })
  getStatus() {
    return this.importerService.getStatus();
  }
}
