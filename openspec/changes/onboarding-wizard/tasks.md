# Tasks

## 1. Backend

- [x] 1.1 Retirar `OnboardingGuard`, `AllowDuringOnboarding`, migración 037 (revertir en local) y su uso en controllers/specs operativos.
- [x] 1.2 Reescribir `OnboardingService`: estado calculado, `dismiss`, `dismissHint` con ids válidos; spec.
- [x] 1.3 `OnboardingController`: `GET /config/onboarding-status`, `POST /config/onboarding/dismiss`, `POST /config/hints/:id/dismiss`; tipos en `@erp/shared-types`.

## 2. Frontend

- [x] 2.1 Retirar `OnboardingWizard`, ruta `/onboarding`, `requireOnboarding` y el uso del 428.
- [x] 2.2 API + hooks (`status`, `dismiss`, `dismissHint`) con specs.
- [x] 2.3 `FirstStepsCard` en el Dashboard (admin) con specs: pasos hechos/pendientes, descartar, oculto al completar.
- [x] 2.4 `ContextHint` y carteles en Productos, Compras y Ventas con specs.

## 3. Verificación

- [ ] 3.1 `pnpm run format:check && pnpm -r run lint && pnpm test && pnpm build` en verde.
- [ ] 3.2 Smoke con Chrome: bloque en Inicio, descarte persistente tras recargar, carteles una vez.
- [ ] 3.3 Documentar las claves de `system_settings` en `docs/`.
