import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { MulterError } from 'multer';
import { ImporterErrorCode } from '@erp/shared-types';

@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter<MulterError> {
  catch(exception: MulterError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    if (exception.code === 'LIMIT_FILE_SIZE') {
      response.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
        statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
        code: ImporterErrorCode.IMPORTER_FILE_TOO_LARGE,
        message: 'El archivo supera el tamaño máximo permitido de 2 MiB.',
      });
      return;
    }

    response.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      code: ImporterErrorCode.IMPORTER_FILE_CORRUPT,
      message: 'No se pudo procesar el archivo adjunto.',
    });
  }
}
