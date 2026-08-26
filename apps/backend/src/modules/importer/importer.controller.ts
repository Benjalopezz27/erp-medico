import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UserRole } from '@erp/shared-types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ImporterService } from './importer.service';
import { UploadFileBodyDto } from './dto/upload-file-body.dto';
import { ImporterUploadResponseDto } from './dto/importer-upload-response.dto';
import { MulterExceptionFilter } from './filters/multer-exception.filter';
import { SECURE_SPREADSHEET_MAX_FILE_SIZE } from '../../shared/parsers/secure-spreadsheet-parser';

@ApiTags('importer')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRADOR)
@Controller('importer')
export class ImporterController {
  constructor(private readonly importerService: ImporterService) {}

  @Get('status')
  @ApiOperation({ summary: 'Check Importer module status' })
  @ApiResponse({ status: 200, description: 'Importer module operational' })
  getStatus() {
    return this.importerService.getStatus();
  }

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @UseFilters(MulterExceptionFilter)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: SECURE_SPREADSHEET_MAX_FILE_SIZE, files: 1 },
    }),
  )
  @ApiOperation({
    summary: 'Subir y validar un archivo de proveedor sin persistirlo',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['supplierId', 'file'],
      properties: {
        supplierId: { type: 'string', format: 'uuid' },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 200, type: ImporterUploadResponseDto })
  @ApiResponse({ status: 400, description: 'Archivo o proveedor inválido' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Requiere rol ADMINISTRADOR' })
  @ApiResponse({ status: 404, description: 'Proveedor no encontrado' })
  @ApiResponse({ status: 413, description: 'Archivo mayor a 2 MiB' })
  @ApiResponse({ status: 415, description: 'Formato no soportado' })
  upload(
    @Body() body: UploadFileBodyDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ImporterUploadResponseDto> {
    return this.importerService.uploadFile(body, file);
  }
}
