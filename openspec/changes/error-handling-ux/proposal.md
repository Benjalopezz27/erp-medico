## Why

El manejo de errores hoy está resuelto de forma sólida en el borde HTTP del backend
(`AllExceptionsFilter` + `StructuredJsonLogger` + request ID), pero se rompe en dos puntos: los
jobs de BullMQ (ej. `FiscalInvoiceProcessor`) lanzan `Error` planos que nunca pasan por ese filtro,
y el frontend no tiene ninguna capa compartida de UX para errores — no hay `ErrorBoundary`, no hay
toast/notification, no hay manejo global de errores de `TanStack Query`, y cada feature reimplementa
su propio parser de errores (`parseFiscalRetryError`, `parseCustomerPricingError`). El resultado:
un error de render deja la app en blanco, y agregar un error nuevo requiere reinventar UI cada vez.

## What Changes

- Se agrega un tipo `ApiErrorResponse` compartido en `packages/shared-types`, generalizando el
  shape que ya emite `AllExceptionsFilter`, para que backend y frontend dejen de definir/parsear
  el shape de error cada uno por su lado.
- Backend: `ValidationPipe` usa un `exceptionFactory` que produce errores de validación con
  estructura por campo (en vez de `message: string[]` plano). Los throws de
  `FiscalInvoiceProcessor` (y otros processors BullMQ) se envuelven en excepciones tipadas con
  `code`, siguiendo el patrón ya usado por `InsufficientStockException`, y quedan expuestos vía la
  entidad de job persistida (no vía el filtro HTTP, que no aplica a un worker).
- Frontend: se agrega un `ErrorBoundary` genérico montado en `main.tsx`, un sistema de
  notificaciones (toast) reusable vía shadcn/`sonner`, y un `QueryCache`/`MutationCache.onError`
  global en `query-client.ts` que dispara ese toast para errores no manejados explícitamente por
  una pantalla.
- Frontend: se agrega un único `parseApiError(error): ApiErrorResponse` que reemplaza los parsers
  ad hoc por feature; las pantallas existentes que ya parsean errores (`fiscal-alerts`,
  `customer-pricing`) migran a usarlo.
- Frontend: se agregan componentes compartidos `Skeleton` y `EmptyState` (shadcn) para
  reemplazar los estados de carga/vacío ad hoc de las tablas existentes.
- **Fuera de alcance (no-goal) de este change:** manejo de conectividad offline. Se identificó
  como hueco (no hay `navigator.onLine` en ningún lado) pero no es bloqueante y se deja para un
  change posterior.

## Capabilities

### New Capabilities

- `api-error-contract`: shape de error compartido (`ApiErrorResponse`) entre backend y frontend,
  errores de validación con estructura por campo, y errores tipados con `code` para jobs BullMQ
  que hoy escapan al filtro HTTP.
- `frontend-error-ux`: capa transversal de UX de errores en el frontend — `ErrorBoundary`, toast
  global, manejo centralizado de errores de queries/mutations, parser único de errores de API, y
  componentes compartidos de estado de carga/vacío (`Skeleton`, `EmptyState`).

### Modified Capabilities

(ninguna — no hay specs existentes en el proyecto todavía)

## Impact

- `packages/shared-types`: nuevo tipo `ApiErrorResponse` (y tipos de error de validación
  field-level) exportado desde el índice del paquete.
- `apps/backend/src/main.ts`: `exceptionFactory` en `ValidationPipe`.
- `apps/backend/src/modules/queue/processors/fiscal-invoice.processor.ts` (y processors BullMQ
  hermanos si aplica el mismo patrón): excepciones tipadas en vez de `Error` plano.
- `apps/backend/src/common/filters/all-exceptions.filter.ts`: ajustar el payload emitido para que
  coincida con el nuevo `ApiErrorResponse` compartido (sin cambiar el contrato externo actual, es
  el mismo shape formalizado como tipo).
- `apps/frontend/src/main.tsx`: agrega `ErrorBoundary` y proveedor de toasts.
- `apps/frontend/src/lib/query-client.ts`: agrega `QueryCache`/`MutationCache.onError`.
- `apps/frontend/src/components/ui/`: nuevos componentes `toast` (sonner), `skeleton`,
  `empty-state`.
- `apps/frontend/src/features/fiscal-alerts/utils/fiscal-alerts.errors.ts` y
  `apps/frontend/src/features/customer-pricing/utils/customer-pricing.errors.ts`: migran a usar el
  parser único en vez de su lógica propia.
- Dependencia nueva: `sonner` (vía shadcn) en `apps/frontend` — requiere aprobación explícita de
  instalación de dependencia según AGENTS.md §6.
