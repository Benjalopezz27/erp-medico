## Context

Ver `proposal.md` - Why. Restricciones relevantes encontradas en el código:

- Router de TanStack es un único archivo `apps/frontend/src/router.tsx` con rutas creadas por
  código (`createRoute`) y registradas en `routeTree.addChildren([...])`. Rutas `/admin/*` ya
  quedan cubiertas por el guard `requireRoutePermission` + `ADMIN_ROUTES` en
  `config/permissions.config.ts`.
- Ya existe `FiscalStatusBadge` (`features/sales/components/FiscalStatusBadge.tsx`) para
  `ArcaStatus` (EMITIDO/PENDIENTE_FACTURACION/RECHAZADO) y `IFiscalDocument` en
  `packages/shared-types/src/models/sales.model.ts`.
- No hay Dialog/AlertDialog de shadcn instalado; el patrón de confirmación de impacto es el
  componente `Modal` (`components/ui/modal.tsx`) usado por `SaleReturnModal`, que ya resuelve
  idempotency key, parseo de error de mutación y validación.
- El patrón de lista paginada con filtros en URL (query keys, `useSearch`, controles de
  paginación) está en `features/sales` + `pages/sales/SalesListPage.tsx`.
- El badge de conteo en `Sidebar` sigue dos variantes ya usadas: badge simple
  (`useStockAlertsCountQuery`) y badge de grupo admin-gated
  (`usePriceReviewPendingCountQuery(isAdmin)`); esta feature usa la segunda variante porque vive
  en el grupo "Administración".
- MSW en este repo solo corre en Node para tests de nivel API (`sales.api.spec.ts`); las páginas
  se testean mockeando el módulo del hook de query con `vi.mock` (patrón dominante, ver
  `StockOverviewPage.spec.tsx`).
- **El contrato backend de #226 no existe todavía** (sin controlador `pending-fiscal` en
  `apps/backend`, sin tipos en `shared-types`). Este design asume el contrato descripto en el
  cuerpo de la issue #226 (paginado, filtros por estado/fecha/tipo, conteo, reintento
  idempotente por `fiscalDocumentId`, 404/409/422 con contrato estable) y lo aísla para que un
  cambio real de contrato no obligue a rehacer la UI completa.

## Goals / Non-Goals

**Goals:**

- Entregar la bandeja funcional end-to-end contra una capa de datos mockeada, testeable y fácil
  de reemplazar cuando #226 aterrice.
- Reusar el máximo de patrones/componentes existentes (`FiscalStatusBadge`, `Modal`,
  `SalesListPage`, query-keys, `Sidebar` badges) para minimizar código nuevo y mantener
  consistencia visual/de accesibilidad.
- Aislar el contrato provisional del backend en un único módulo de tipos + API client, de forma
  que integrar #226 real sea cambiar la capa de datos, no la UI.

**Non-Goals:**

- No se implementa el backend de #226 (retry engine, BullMQ, `FECompConsultar`).
- No se resuelve PDF/QR (#225); si el backend expone `qrCodeData` se linkea al detalle de venta
  donde eventualmente esté disponible, sin renderizarlo acá.
- No se agrega notificación externa, polling en tiempo real, WebSocket ni SSE.
- No se promueven los tipos provisionales a `packages/shared-types` en este change (se hace
  cuando #226 defina el contrato real).

## Decisions

### 1. Tipos y API client frontend-local, no en shared-types

Se crea `features/fiscal-alerts/types/fiscal-alerts.types.ts` con `IFiscalAlertRow`,
`IFiscalAlertsSearchParams`, `IPaginatedFiscalAlertsResponse`, `IFiscalRetryResult` y un enum de
error codes (`FiscalRetryErrorCode`), en vez de tocar `packages/shared-types`.
**Alternativa descartada**: agregarlos a `shared-types` ahora. Se descarta porque `shared-types`
es un contrato compartido con el backend real; comprometerlo antes de que #226 exista arriesga
un contrato incorrecto que backend deba romper al implementarse (YAGNI + evita acoplar frontend a
una forma que puede cambiar).

### 2. Capa de datos mockeada detrás de la misma interfaz que usará la API real

`features/fiscal-alerts/api/fiscal-alerts.api.ts` expone `getFiscalAlertsApi(params)`,
`getFiscalAlertsCountApi()` y `retryFiscalDocumentApi(id, idempotencyKey)` con la firma que
tendrán las llamadas reales a `apiClient` (mismo cliente HTTP que el resto del proyecto,
`apiClient.get('/sales/pending-fiscal', { params })`, etc.). En desarrollo/test, MSW
(`test/mocks/handlers.ts`) intercepta esas rutas; en test de página se sigue el patrón dominante
de `vi.mock` sobre los hooks de query. Integrar el backend real de #226 es reemplazar el mock del
handler, no la firma del cliente.
**Alternativa descartada**: mockear directamente en el hook (`use-fiscal-alerts-query`) sin pasar
por `apiClient`. Se descarta porque rompe el patrón existente (`sales.api.ts`) y dificulta el
swap a backend real.

### 3. Reuso de `Modal` + patrón de `SaleReturnModal` para el diálogo de reintento

No se introduce una librería de diálogos (no hay Dialog/AlertDialog de shadcn en el repo). Se
reusa `Modal` con el mismo patrón de idempotency key (`crypto.randomUUID()` generado una vez por
apertura del diálogo, reenviado en la mutación) y parseo de error de `SaleReturnModal`, para
manejar consistentemente 404/409/422 y prevenir doble submit (deshabilitar botón de confirmación
mientras la mutación está `isPending`, más el guard de idempotency key en el backend real).

### 4. Badge de conteo como badge de grupo admin-gated

Se sigue el patrón de `usePriceReviewPendingCountQuery(isAdmin)`: un hook
`useFiscalAlertsCountQuery(isAdmin)` con `enabled: isAdmin`, `staleTime` razonable (60s, igual
que `useStockAlertsCountQuery`) y `select` para extraer el total. Se renderiza dentro del grupo
"Administración" de `Sidebar.tsx`, oculto cuando el total es 0.
**Alternativa descartada**: badge top-level como el de stock. Se descarta porque la página es
admin-only y ya existe un grupo "Administración" con el mismo patrón de badge condicionado a rol.

### 5. Reconciliación tras respuesta concurrente

La mutación de reintento, al recibir cualquier respuesta (éxito, 404, 409, 422), invalida las
query keys de lista, conteo y detalle de venta (`queryClient.invalidateQueries`) antes de decidir
el mensaje a mostrar. Así la UI nunca queda con datos obsoletos tras una condición de carrera,
siguiendo la regla de negocio de que el backend es autoritativo sobre el estado del documento.

## Risks / Trade-offs

- **[Riesgo] El contrato real de #226 difiere del asumido** (nombres de campos, códigos de error,
  forma de paginación) → Mitigación: contrato aislado en un único archivo de tipos + un único
  archivo de API client; el resto de la feature (componentes, hooks de UI) depende de los tipos
  locales, no de la forma cruda de la respuesta HTTP.
- **[Riesgo] Sin backend real, los criterios de aceptación que requieren "consumiendo estado
  real" (demo end-to-end) no pueden verificarse contra ARCA real** → Mitigación: la demo se corre
  contra MSW con escenarios controlados (pendiente → rechazado → reintento → emisión); se deja
  registrado en `tasks.md` como seguimiento para cuando #226 esté disponible.
- **[Trade-off] No promover tipos a `shared-types` ahora** → implica un segundo paso de
  integración cuando #226 aterrice (mapear tipos locales a los reales), a cambio de no
  comprometer un contrato compartido con datos fiscales sensibles antes de que exista.

## Migration Plan

No aplica (feature nueva, sin datos existentes que migrar). Rollout: PR contra `dev`, sin flag de
feature (ruta nueva no rompe rutas existentes). Rollback: revertir el PR (ruta y entrada de
sidebar aisladas, sin cambios de esquema ni de contrato backend).

## Open Questions

- Ninguna que cambie el alcance, el approach o las tareas: el contrato provisional queda resuelto
  con el aislamiento descripto en la Decisión 1 y 2; se reconcilia cuando #226 se implemente.
