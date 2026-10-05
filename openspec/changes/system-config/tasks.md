# Tasks

## 1. Shared types y persistencia

- [x] 1.1 Agregar `ISystemConfig` y `IUpdateSystemConfig` en `packages/shared-types/src/models`. Verificar con build de `shared-types` sin errores.
- [x] 1.2 Migración `1700000000033-CreateSystemSettings` (tabla `system_settings`, `down` que la elimina) y entidad `SystemSetting`. Verificar con `pnpm db:migrate` y `pnpm db:revert` solo en la base local.

## 2. Backend

- [x] 2.1 Tests que fallan primero en `system-config.service.spec.ts`: efectivo (DB, env, default), actualización con auditoría por campo, sin cambios no escribe, valor inválido. Implementar `getEffective`, `getIssuer` y `updateSettings`. Verificar que pasan.
- [x] 2.2 DTO `UpdateSystemConfigDto` con validaciones y tests de validación (CUIT inválido, punto de venta 0 y 100000, moneda, condición). Verificar que pasan.
- [x] 2.3 Endpoints `GET /config` y `PATCH /config` con guards ADMINISTRADOR y test del controller (roles y delegación). Verificar que pasan.
- [x] 2.4 Conectar consumidores: processor de PDF fiscal, `ReceiptsController` e `InvoiceTypeResolverService` leen el valor efectivo. Actualizar sus specs. Verificar que la suite del backend pasa.

## 3. Frontend

- [ ] 3.1 `features/system-config/` (api, hook de query y mutation, validación de formulario, tests). Verificar con vitest.
- [ ] 3.2 Componente `SystemConfigForm` con aviso WSFE y pestaña "General" solo ADMINISTRADOR en `SettingsPage`. Test de render, validación y guardado. Verificar con vitest.

## 4. Cierre

- [ ] 4.1 `pnpm run format:check && pnpm -r run lint && pnpm test && pnpm build` en verde.
