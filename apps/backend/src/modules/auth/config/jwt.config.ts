import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';

const EXPIRATION_REGEX = /^([1-9]\d*)([smhd])$/;

export interface ValidatedJwtConfig {
  secret: string;
  expiresIn: string;
}

export const validateJwtConfig = (
  configService: ConfigService,
): ValidatedJwtConfig => {
  const secret = configService.get<string>('JWT_SECRET');
  const expiresIn = configService.get<string>('JWT_EXPIRATION');

  if (!secret) {
    throw new Error('[FATAL] JWT_SECRET environment variable is missing.');
  }

  // Defensive byte length measurement without silent trimming
  const byteLength = Buffer.byteLength(secret, 'utf8');
  if (byteLength < 32) {
    throw new Error(
      `[FATAL] JWT_SECRET must contain at least 32 bytes; production secrets must be generated with a cryptographically secure random source (current length: ${byteLength} bytes).`,
    );
  }

  if (!expiresIn) {
    throw new Error('[FATAL] JWT_EXPIRATION environment variable is missing.');
  }

  const trimmedExpiration = expiresIn.trim();
  if (!EXPIRATION_REGEX.test(trimmedExpiration)) {
    throw new Error(
      `[FATAL] Invalid JWT_EXPIRATION format: "${expiresIn}". Supported formats: e.g. "15m", "8h", "7d", "3600s" (positive integer with unit s/m/h/d).`,
    );
  }

  return { secret, expiresIn: trimmedExpiration };
};

export const getJwtModuleOptions = (
  configService: ConfigService,
): JwtModuleOptions => {
  const { secret, expiresIn } = validateJwtConfig(configService);
  return {
    secret,
    signOptions: {
      expiresIn: expiresIn as unknown as any,
      algorithm: 'HS256',
    },
  };
};
