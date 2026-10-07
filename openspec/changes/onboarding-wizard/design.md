# Design

## Context

- `system_settings(key PK, value text)` ya existe (migración 033) y `SystemSettingsService` lee/escribe claves con auditoría. Fila ausente = no definido.
- El certificado ARCA se carga solo desde env (`ARCA_CERT_BASE64`/`ARCA_CERT_PATH`) en `ArcaCertificateLoaderService`; ya existe `GET /arca/probe` (admin) que reporta estado del cert. Decisión previa de `system-config`: WSFE/CUIT en env.
- Los guards actuales son por controller (`JwtAuthGuard`, `RolesGuard`); el único `APP_GUARD` es `ThrottlerGuard`.
- Tesorería permite `POST /treasury/movements` (movimiento manual) y stock `POST /stock/adjustments`: sirven para saldo y stock iniciales.

## Goals / Non-Goals

**Goals**

- Orquestar módulos existentes sin duplicar CRUD ni lógica de negocio.
- Estado persistido, reentrante, y bloqueo operativo seguro para instalaciones existentes.

**Non-Goals**

- Subir o guardar el `.p12`; cambiar de env a DB la fuente fiscal; issues hermanas por módulo.

## Decisions

1. **Claves en `system_settings`** (`onboarding_completed`, `onboarding_step_<id>` = `done|skipped`), sin tabla ni columna nuevas. Alternativa (columna + migración de esquema) descartada: contradice el key/value y obliga a migrar por parámetro.
2. **Módulo global `modules/onboarding`** (importa `SystemConfigModule`): `OnboardingService` calcula el estado **derivado de los datos reales** de cada módulo (conteos vía repositorios/servicios exportados) más las marcas de `skipped`. Derivar evita estados desincronizados si se carga algo fuera del wizard.
3. **`OnboardingGuard`** (`CanActivate`) aplicado con `@UseGuards` en los controllers operativos (`sales`, `sale-returns`, `pending-fiscal`, `stock`, `payments`, `receipts`, `receivables`, `purchases`, `goods-receipts`, `supplier-invoices`, `checks`, `cash-register`); `@AllowDuringOnboarding()` deja libres `GET /stock` y `POST /stock/adjustments` (paso 7), no global: lista explícita, simple de auditar y deja libres auth/config/CRUD del wizard. Lanza `PreconditionRequiredException` (428) con `{ pendingStep }`. Lanza `HttpException` 428 (Nest 10 no trae `PreconditionRequired`). Resultado cacheado en memoria hasta que cambie el flag (se invalida al finalizar).
4. **Finalizar**: `POST /config/onboarding/complete` valida obligatorios y escribe `onboarding_completed=true`; `POST /config/onboarding/steps/:id/skip` solo para pasos opcionales.
5. **Backfill** en migración `…037-BackfillOnboardingCompleted`: inserta la clave `true` si hay users y (products o sales). `down` borra la clave. Corre solo en local; no contra staging/producción por agente.
6. **Paso fiscal**: reusa `PATCH /config` para datos del emisor y consulta el estado del cert vía `/arca/probe` (`IArcaService`); en dev usa `ArcaMockService`.
7. **Tesorería**: medios de pago son un enum fijo y las cuentas se siembran (migración 034); el paso solo carga saldo inicial (`POST /treasury/movements`), es omitible (saldo cero).
8. **Montos/stock**: decimal canónico (`docs/decimal_policy.md`); los formularios envían strings y reusan los DTOs existentes.
9. **Frontend**: `features/onboarding` con `OnboardingWizard` como checklist: el paso fiscal embebe `SystemConfigForm`; los demás enlazan a la pantalla existente de su módulo (no se reimplementa CRUD) y el estado se refresca al volver. Rutas de esos módulos quedan permitidas durante el onboarding, hook `useOnboardingStatus`. Redirección vía `beforeLoad` en `router.tsx` y manejo de 428 en el cliente HTTP.

## Risks / Trade-offs

- Bloquear producción al desplegar → mitigado con backfill y lista explícita de controllers.
- Heurística de backfill (users + datos) puede marcar completo un sistema a medio configurar → aceptado; el admin puede revisar desde los módulos normales.
- Guard aplicado por controller: un controller operativo nuevo debe acordarse de usarlo → test que recorre controllers listados.
- Alcance grande en un PR: se parte en commits por bloque (backend estado/guard, shell, pasos).
