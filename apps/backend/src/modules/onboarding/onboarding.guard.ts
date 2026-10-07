import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OnboardingService } from './onboarding.service';

const ALLOW_KEY = 'allowDuringOnboarding';
/** Rutas de un controller bloqueado que el wizard necesita usar. */
export const AllowDuringOnboarding = () => SetMetadata(ALLOW_KEY, true);

/** 428 con el paso pendiente mientras el onboarding no esté completo. */
@Injectable()
export class OnboardingGuard implements CanActivate {
  constructor(
    private readonly onboarding: OnboardingService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.get<boolean>(ALLOW_KEY, context.getHandler())) {
      return true;
    }
    if (await this.onboarding.isCompleted()) return true;
    const { pendingStep } = await this.onboarding.getStatus();
    throw new HttpException(
      {
        message: 'Configuración inicial incompleta',
        code: 'ONBOARDING_REQUIRED',
        pendingStep,
      },
      HttpStatus.PRECONDITION_REQUIRED,
    );
  }
}
