import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { RequestContextService } from '../services/request-context.service';

export const REQUEST_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const rawHeader = req.headers['x-request-id'];
    let requestId: string;

    if (
      typeof rawHeader === 'string' &&
      REQUEST_ID_REGEX.test(rawHeader.trim())
    ) {
      requestId = rawHeader.trim();
    } else {
      requestId = randomUUID();
    }

    // Backend is authoritative for setting response header
    res.setHeader('X-Request-ID', requestId);

    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      req.ip;

    RequestContextService.run(
      {
        requestId,
        ip: clientIp,
        method: req.method,
        url: req.originalUrl || req.url,
        startTime: Date.now(),
      },
      () => next(),
    );
  }
}
