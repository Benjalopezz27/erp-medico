## 1. Contrato de error compartido

- [x] 1.1 Agregar tipo `ApiErrorResponse` (y tipo de detalle de validación por campo) en
      `packages/shared-types/src/models/` y exportarlo desde `packages/shared-types/src/index.ts`;
      verificar con `pnpm --filter shared-types build` (o el comando de build del paquete) sin
      errores de tipos.

## 2. Backend: validación por campo

- [x] 2.1 Agregar `exceptionFactory` custom al `ValidationPipe` en `apps/backend/src/main.ts` que
      produzca `details: Array<{ field, constraints }>` a partir del arreglo de `ValidationError`;
      verificar con un test que un DTO con dos campos inválidos devuelve `details` con ambos
      campos.
- [x] 2.2 Actualizar `AllExceptionsFilter` para tipar su payload de salida contra
      `ApiErrorResponse` de `shared-types` (sin cambiar el shape en runtime); verificar que el
      build de TypeScript del backend no rompe.

## 3. Backend: código de error tipado en jobs BullMQ

- [x] 3.1 ~~Escribir migración TypeORM que agrega columna nullable `arcaErrorCode`~~ — entregado
      por el change concurrente `arca-contingency-engine` (PR #234, merged a `sprint/8` mientras
      se implementaba este), migración `1700000000028-AddFiscalContingencyMetadata.ts`. Se
      descartó la migración propia (duplicada) y se rebasó sobre esa versión.
- [x] 3.2 ~~Actualizar `FiscalInvoiceProcessor` para poblar `arcaErrorCode`~~ — entregado por el
      mismo change concurrente, con un motor de reintentos más completo (`attemptCount`,
      `failureStage`, `nextAttemptAt`) que ya popula `arcaErrorCode` en cada rama de fallo. Se
      descartó el patch propio (duplicado/obsoleto) y se tomó la versión de `sprint/8` tal cual.
- [x] 3.3 Exponer `arcaErrorCode` en el/los endpoint(s) o vista que ya devuelven el estado del
      comprobante fiscal al frontend; verificar con un request de prueba que el campo viaja en la
      respuesta.

## 4. Frontend: aislamiento de errores de render

- [x] 4.1 Crear componente `ErrorBoundary` genérico (con acción de recarga) y montarlo en
      `apps/frontend/src/main.tsx` envolviendo el árbol de rutas; verificar con un test que un
      componente hijo que lanza en render no tira el resto de la app (queda contenido el
      fallback).

## 5. Frontend: notificaciones y manejo centralizado de errores

- [x] 5.1 Agregar `sonner` como dependencia de `apps/frontend` (requiere aprobación explícita de
      instalación) y el proveedor de toasts de shadcn/ui montado junto al `ErrorBoundary`;
      verificar que `pnpm -r run lint` y el build del frontend pasan con la dependencia nueva.
- [x] 5.2 Crear `parseApiError(error: unknown): ApiErrorResponse` en
      `apps/frontend/src/lib/errors/parse-api-error.ts`; verificar con tests unitarios que
      interpreta correctamente una respuesta de error del backend, un error de red sin respuesta,
      y un error desconocido.
- [x] 5.3 Agregar `QueryCache.onError` en `apps/frontend/src/lib/query-client.ts` que llama a
      `parseApiError` y dispara el toast, respetando `meta.skipGlobalErrorToast`; verificar con un
      test que una query fallida sin ese flag dispara el toast y una con el flag no lo hace.
      **Ajustado en el smoke manual (8.2):** se descartó `MutationCache.onError` — el smoke
      encontró que ~36 archivos del frontend ya usan `mutateAsync` + `catch` inline para mostrar
      errores de mutation (no solo las 2 features migradas en el grupo 6), así que un toast
      automático por default habría duplicado el mensaje en casi toda mutation existente. Las
      mutations quedan fuera del toast global; solo las queries (donde el manejo inline es la
      excepción, no la regla) lo tienen por default.

## 6. Frontend: migrar parsers existentes

- [x] 6.1 Migrar `apps/frontend/src/features/fiscal-alerts/utils/fiscal-alerts.errors.ts` a usar
      `parseApiError` como base y setear `skipGlobalErrorToast` donde ya tiene manejo inline;
      verificar que los tests existentes de esa feature siguen pasando.
- [x] 6.2 Migrar `apps/frontend/src/features/customer-pricing/utils/customer-pricing.errors.ts` de
      la misma forma; verificar que los tests existentes de esa feature siguen pasando.

## 7. Frontend: estados de carga y vacío compartidos

- [x] 7.1 Agregar componentes `Skeleton` y `EmptyState` en `apps/frontend/src/components/ui/`;
      verificar con un test de render de cada componente.
- [x] 7.2 Reemplazar el estado de carga/vacío ad hoc de al menos una tabla existente (ej.
      `ProductsTable.tsx`) por los componentes nuevos, como referencia del patrón; verificar
      visualmente (smoke) que la tabla muestra skeleton mientras carga y empty state sin
      resultados.

## 8. Verificación integral

- [x] 8.1 Correr `pnpm run format:check && pnpm -r run lint && pnpm test && pnpm build` (orden de
      CI, ver AGENTS.md §3) y confirmar que pasa completo antes de abrir el PR. De paso se
      encontró y corrigió un bug preexistente ajeno a este change (`FiscalAlertsTable.tsx` /
      `RetryFiscalDocumentModal.tsx` construían un `IFiscalDocument` sin `pdfStatus`/`qrAvailable`,
      requeridos desde el PR #233; `tsc --noEmit` no lo detectaba pero `tsc -b`, que es lo que usa
      `pnpm build`, sí) — confirmado con el usuario antes de tocarlo.
- [x] 8.2 Smoke manual contra los dev servers reales (backend :3000, frontend :5173): - Error de validación (`POST /auth/login` con email inválido y password vacío) → confirmado
      vía `curl`: `details` field-level (`{field, constraints}`), `code: VALIDATION_ERROR`,
      `requestId` presente. - Error de dominio por default (404, 401) → confirmado vía `curl`: mismo shape consistente,
      `requestId` en cada respuesta. - App en el browser: bootea sin errores de consola; `ErrorBoundary` + `Toaster` (sonner)
      montados correctamente en el árbol real (`<section aria-label="Notifications alt+T">`
      confirmado en el DOM). - Login con credenciales inválidas en UI real: error inline existente se muestra
      (`Credenciales inválidas`), **sin** toast duplicado — confirma que la corrección de la
      tarea 5.3 (sacar `MutationCache.onError`) funciona como se espera. - Render forzado a fallar y error de red simulado: cubiertos por test automatizado
      (`error-boundary.spec.tsx`, `parse-api-error.spec.ts`) en vez de repetirse a mano — mismo
      comportamiento en jsdom que en browser real para estos casos. - Stock insuficiente (dominio conocido con `code` propio): no se reprodujo end-to-end en el
      smoke por falta de datos de prueba a mano para armar una venta con stock insuficiente real;
      el shape de esa excepción ya está cubierto por `insufficient-stock.exception.ts` +
      `all-exceptions.filter.spec.ts` (backend) sin cambios de este change.
