## Why

Un Administrador no tiene forma de ver comprobantes fiscales pendientes/rechazados (ARCA) ni de
pedir un reintento sin operar Redis, la base de datos o herramientas externas. Issue #210 muestra
el estado fiscal dentro del detalle de venta, pero no existe una vista operativa consolidada. El
motor backend de contingencia (#226) expone listado, conteo y reintento idempotente; falta la
bandeja administrativa que los consume.

## What Changes

- Nueva ruta protegida `/admin/fiscal-alerts` (solo `ADMINISTRADOR`), registrada en
  `router.tsx` con guard `requireRoutePermission` (patrón ya usado por `/admin/*`).
- Tabla de Facturas y Notas de Crédito con estado `PENDIENTE_FACTURACION`/`RECHAZADO`, venta o
  devolución asociada, cliente, fecha, importe, tipo, intentos, último/próximo intento y error
  sanitizado.
- Tabs o filtro equivalente "Pendientes"/"Rechazados" + filtros por rango de fechas, tipo de
  comprobante y búsqueda por número de venta/cliente, todos reflejados en la URL
  (`validateFiscalAlertsSearchParams`) y con paginación manual (patrón `SalesListPage`).
- Estados de carga, vacío, error y reintento de consulta, accesibles.
- Acción "Reintentar" (solo Administrador) vía diálogo de confirmación (`Modal` +
  patrón de `SaleReturnModal`, con idempotency key), deshabilitada si ya existe un job activo o
  si el backend indica que el documento no es reintentable.
- Manejo accionable de 404/409/422 devueltos por el endpoint de reintento (documento inexistente,
  ya emitido, job activo, rechazo no reintentable, datos/configuración pendientes) sin interpretar
  strings SOAP ni mostrar secretos/XML.
- Badge de conteo de pendientes/rechazados en el grupo de navegación "Administración" del
  `Sidebar`, oculto en cero, sin polling agresivo (política de caché de TanStack Query).
- "Ver detalle" navega a la venta y permite identificar la Nota de Crédito/devolución relacionada.
- **Contrato backend provisorio**: la issue #226 (listado `GET /sales/pending-fiscal`, conteo y
  reintento) todavía no está implementada ni mergeada a `dev`. Esta UI se construye contra tipos y
  mocks locales (MSW/`vi.mock`) modelados sobre la especificación textual de #226; cuando #226
  aterrice, los tipos se promueven a `packages/shared-types` y se valida el contrato real (tarea
  de seguimiento, no bloquea esta entrega).

## Capabilities

### New Capabilities

- `sales/fiscal-alerts-dashboard`: bandeja administrativa de comprobantes fiscales
  pendientes/rechazados con filtros, paginación, badge de conteo y reintento manual.

### Modified Capabilities

(ninguna — no existen specs previos en `openspec/specs/`, este es el primer change del repo)

## Impact

- **Frontend** (`apps/frontend/src`): nueva ruta en `router.tsx`, nueva feature
  `features/fiscal-alerts/` (api, hooks, componentes, schemas, testing), nueva página
  `pages/admin/FiscalAlertsPage.tsx`, entrada en `config/permissions.config.ts` (ya cubierta por
  prefijo `/admin`), badge en `components/layout/Sidebar.tsx`.
- **shared-types**: sin cambios inmediatos; tipos de contrato (`IFiscalAlertsSearchParams`,
  `IPaginatedFiscalAlertsResponse`, `IFiscalRetryPayload`, códigos de error) quedan
  frontend-local hasta que #226 defina el contrato real.
- **Backend**: ninguno en este change; depende de #226 fuera de este alcance.
- **Tests**: MSW handlers nuevos para pruebas de nivel API; `vi.mock` de hooks para pruebas de
  página (patrón dominante en el repo).
