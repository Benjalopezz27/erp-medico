## 1. Tipos y capa de datos (provisional)

- [x] 1.1 Crear `features/fiscal-alerts/types/fiscal-alerts.types.ts` con `IFiscalAlertRow`,
      `IFiscalAlertsSearchParams`, `IPaginatedFiscalAlertsResponse`, `IFiscalRetryResult` y
      `FiscalRetryErrorCode`, reusando `IFiscalDocument`/`ArcaStatus`/`FiscalDocumentType` de
      `packages/shared-types`; verificar que compila (`pnpm --filter frontend build` o
      `tsc --noEmit`).
- [x] 1.2 Crear `features/fiscal-alerts/api/fiscal-alerts.api.ts` con `getFiscalAlertsApi`,
      `getFiscalAlertsCountApi`, `retryFiscalDocumentApi` sobre `apiClient`, siguiendo el patrón
      de `features/sales/api/sales.api.ts`; verificar con un test de nivel API
      (`fiscal-alerts.api.spec.ts`) contra MSW.
- [x] 1.3 Agregar handlers MSW para `GET /sales/pending-fiscal` (listado + conteo) y
      `POST` de reintento en `apps/frontend/src/test/mocks/handlers.ts`, con fixtures builder
      `features/fiscal-alerts/testing/fiscal-alerts-fixtures.ts` (patrón
      `buildPaginatedStockResponse`); verificar que el test de 1.2 pasa contra estos handlers.

## 2. Query hooks

- [x] 2.1 Crear `features/fiscal-alerts/hooks/fiscal-alerts-keys.ts` (query keys: `all`,
      `lists()`, `list(params)`, `count()`) siguiendo `sales-keys.ts`.
- [x] 2.2 Crear `use-fiscal-alerts-query.ts` (`useQuery` con `keepPreviousData`) y
      `use-fiscal-alerts-count-query.ts` (`enabled: isAdmin`, `staleTime: 60_000`, `select` al
      total); verificar con tests unitarios de hook mockeando `fiscal-alerts.api`.
- [x] 2.3 Crear `use-retry-fiscal-document-mutation.ts`: genera idempotency key por apertura de
      diálogo, invalida `lists()`, `count()` y `salesKeys.detail(saleId)` en `onSettled`, mapea
      404/409/422 a mensajes accionables vía `FiscalRetryErrorCode`; verificar con tests que
      cubran éxito, 404, 409, 422 y doble-submit bloqueado.

## 3. Ruta y permisos

- [x] 3.1 Agregar `validateFiscalAlertsSearchParams` en
      `features/fiscal-alerts/schemas/fiscal-alerts.schema.ts` (estado tab, rango de fechas, tipo
      de comprobante, búsqueda, página/límite) siguiendo `validateSupplierInvoiceSearchParams`.
- [x] 3.2 Registrar `fiscalAlertsRoute` en `router.tsx` (`/admin/fiscal-alerts`, guard
      `requireRoutePermission('/admin/fiscal-alerts')`) y agregarla a `routeTree.addChildren`;
      verificar que un test de router/permiso confirma 403/redirect para `VENDEDOR` y acceso para
      `ADMINISTRADOR`.

## 4. Componentes de la bandeja

- [x] 4.1 Crear `pages/admin/FiscalAlertsPage.tsx` con tabs Pendientes/Rechazados, filtros
      (fecha, tipo, búsqueda) sincronizados a la URL vía `useSearch`/`navigate`, siguiendo
      `SalesListPage.tsx`.
- [x] 4.2 Crear `FiscalAlertsTable.tsx` reusando `FiscalStatusBadge` para el estado, mostrando
      venta/devolución, cliente, fecha, importe, tipo, intentos, último/próximo intento y error
      sanitizado; incluir acción "Ver detalle" (navega a la venta) y "Reintentar" condicionada a
      lo que el backend indique como reintentable.
- [x] 4.3 Implementar paginación manual reusando el patrón de controles de `SalesListPage.tsx`
      (`meta.hasNextPage/hasPreviousPage/page/totalPages/limit`).
- [x] 4.4 Implementar estados de loading, vacío y error con retry de consulta, accesibles
      (roles/aria acordes al patrón ya usado en `SalesListPage`/`StockOverviewPage`).

## 5. Diálogo de reintento

- [x] 5.1 Crear `RetryFiscalDocumentModal.tsx` sobre `components/ui/modal.tsx`, siguiendo el
      patrón de idempotency key y manejo de error de `SaleReturnModal.tsx`; el texto explica que
      primero se consulta ARCA y que la venta sigue confirmada.
- [x] 5.2 Deshabilitar el botón de confirmación mientras la mutación está `isPending` y cerrar el
      diálogo solo tras `onSettled`; verificar con un test que simula doble click y confirma una
      única llamada a `retryFiscalDocumentApi`.
- [x] 5.3 Manejar reconciliación en 404/409/422 y en éxito concurrente (`EMITIDO`): cerrar/
      actualizar el diálogo con el estado autoritativo devuelto, sin afirmar una nueva emisión
      cuando no ocurrió; verificar con tests por cada código de estado.

## 6. Badge de navegación

- [x] 6.1 Agregar entrada "Alertas Fiscales" al grupo "Administración" de
      `components/layout/Sidebar.tsx`, con badge de conteo admin-gated (`useFiscalAlertsCountQuery`)
      oculto en cero, `data-testid="fiscal-alerts-badge"`; verificar con un test de `Sidebar` que
      cubra rol admin/no-admin y conteo cero/no-cero.

## 7. Tests de página e integración

- [x] 7.1 Crear `FiscalAlertsPage.spec.tsx` mockeando los hooks de query (`vi.mock`), siguiendo
      `StockOverviewPage.spec.tsx`: cubre render de pendientes/rechazados, filtros URL,
      paginación, loading/empty/error.
- [x] 7.2 Crear un test de integración de la demo con MSW y estados controlados: documento falla
      → queda pendiente/rechazado → Administrador reintenta → documento se emite; verificar que
      lista, badge y detalle de venta quedan coherentes al final.
- [x] 7.3 Verificar accesibilidad de tabla, tabs/filtros, modal y anuncios de resultado
      (roles ARIA, foco al abrir/cerrar el modal, `aria-live` en feedback de mutación).

## 8. Verificación final

- [x] 8.1 Correr `pnpm run format:check && pnpm -r run lint && pnpm test && pnpm build` y
      confirmar CI local en verde antes de abrir PR.
- [x] 8.2 Smoke manual con Claude in Chrome contra la app corriendo con mocks: login
      Administrador → `/admin/fiscal-alerts` → filtrar → reintentar → ver conteo/detalle
      actualizados; login Vendedor → confirmar rechazo de acceso directo a la URL.
- [x] 8.3 Dejar registrado en el PR/issue el seguimiento pendiente: reemplazar tipos y mocks
      provisionales por el contrato real de #226 cuando esa issue se mergee a `dev`.
