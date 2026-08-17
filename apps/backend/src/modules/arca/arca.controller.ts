import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ArcaService } from './arca.service';

@ApiTags('arca')
@Controller('arca')
export class ArcaController {
  constructor(private readonly arcaService: ArcaService) {}

  @Get('status')
  @ApiOperation({ summary: 'Check ARCA module status' })
  @ApiResponse({ status: 200, description: 'ARCA module operational' })
  getStatus() {
    return this.arcaService.getStatus();
  }
}
