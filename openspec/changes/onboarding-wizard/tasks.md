# Tasks

## 1. Backend — estado y API

- [ ] 1.1 `OnboardingService` en `modules/config`: calcula pasos (derivado de datos + claves `skipped`), primer pendiente, `complete`/`skip`; spec con repos mockeados.
- [ ] 1.2 Endpoints `GET /config/onboarding-status`, `POST /config/onboarding/steps/:id/skip`, `POST /config/onboarding/complete` (admin, Swagger) + tipos en `@erp/shared-types`; spec del controller.
- [ ] 1.3 `OnboardingGuard` (428 + `pendingStep`) con spec; aplicarlo a controllers operativos; spec que verifica 428 y que auth/config/CRUD del wizard siguen libres.
- [ ] 1.4 Migración `BackfillOnboardingCompleted` (up/down); verificar local up/down/up.

## 2. Frontend — shell

- [ ] 2.1 `onboarding.api.ts`, `useOnboardingStatus` y mutaciones skip/complete, con specs.
- [ ] 2.2 `OnboardingWizard` (stepper, reentrada al paso pendiente, omitir) + ruta y redirección en `router.tsx`; manejo de 428 en el cliente HTTP; specs.

## 3. Frontend — pasos

- [ ] 3.1 Paso 1 Empresa y fiscal (reusa `SystemConfigForm` + estado de cert vía probe; sin subida de `.p12`).
- [ ] 3.2 Paso 2 Usuarios y paso 3 Categorías y unidades (reusan forms/hooks existentes).
- [ ] 3.3 Paso 4 Productos/precios/costos y paso 5 Clientes y proveedores (omitibles).
- [ ] 3.4 Paso 6 Tesorería (medios de pago y saldo inicial) y paso 7 Stock inicial (ajustes; omitido si se omitió el 4).

## 4. Verificación

- [ ] 4.1 `pnpm run format:check && pnpm -r run lint && pnpm test && pnpm build` en verde.
- [ ] 4.2 Smoke con Chrome: base vacía → wizard → completar → operar; reinicio a mitad de camino reentra.
- [ ] 4.3 Documentar el flag y el backfill en `docs/`.
