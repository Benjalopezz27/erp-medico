## Context

`AllExceptionsFilter` (`apps/backend/src/common/filters/all-exceptions.filter.ts`) ya arma un
payload consistente (`statusCode`, `message`, `error`, `code?`, `details?`, `requestId`, `timestamp`,
`path`) para todo lo que pasa por el borde HTTP. `ValidationPipe` (`main.ts`) usa su
`exceptionFactory` implícito, que produce `message: string[]` sin estructura por campo.
`FiscalInvoiceProcessor` corre fuera de ese borde (worker BullMQ): sus fallos terminales se
persisten en `FiscalDocument.arcaErrorMessage` como texto libre con un prefijo por convención
(`"WSFE_REJECTED: ..."`, `"TOTALS_MISMATCH: ..."`); los transitorios ni siquiera se persisten,
quedan solo en logs, y el documento sigue en `PENDIENTE_FACTURACION`. En el frontend no existe
capa compartida de UX de error (ver `proposal.md`).

## Goals / Non-Goals

**Goals:**

- Un solo tipo de error (`ApiErrorResponse`) compilado en `packages/shared-types`, consumido sin
  duplicar definición ni en backend ni en frontend.
- Errores de validación y de jobs BullMQ con código estable, no solo texto libre.
- Una única superficie de UX de error en el frontend (boundary + toast + parser), sin tocar el
  95% de pantallas existentes salvo las dos que ya tienen parser propio.

**Non-Goals:**

- No se cambia el contrato externo de la API para clientes que no sean el frontend propio (el
  shape de `AllExceptionsFilter` se formaliza como tipo, no se rompe).
- No se implementa manejo de offline/conectividad (ver proposal.md, fuera de alcance).
- No se migran automáticamente todas las pantallas con manejo de error ad hoc — solo se
  documenta el patrón nuevo y se migran los dos ejemplos existentes (`fiscal-alerts`,
  `customer-pricing`) como referencia; el resto migra de forma incremental fuera de este change.

## Decisions

### 1. `ApiErrorResponse` vive en `packages/shared-types`, no se inventa un nuevo shape

Se toma el payload que ya emite `AllExceptionsFilter` (línea 107-116) tal cual está en producción
y se lo formaliza como tipo TS exportado desde `packages/shared-types/src/index.ts`. Alternativa
descartada: definir un shape "ideal" nuevo tipo RFC 7807 (`application/problem+json`). Se descarta
porque implica migrar todos los consumidores actuales del filtro (frontend y cualquier cliente
externo) sin necesidad — el shape actual ya cubre lo que hace falta.

### 2. Validación por campo vía `exceptionFactory`, sin cambiar `class-validator`

Se agrega un `exceptionFactory` custom al `ValidationPipe` en `main.ts` que transforma el arreglo
de `ValidationError` de `class-validator` en `details: Array<{ field: string; constraints:
string[] }>`, manteniendo `message` como resumen legible para no romper consumidores que ya leen
`message`. Alternativa descartada: adoptar una librería de validación distinta (zod en backend)
— fuera de alcance, `class-validator` ya está integrado en todos los DTOs existentes.

> **Nota post-implementación:** mientras se implementaba este change, el change concurrente
> `arca-contingency-engine` (PR #234) se mergeó a `sprint/8` y entregó exactamente esta columna y
> este comportamiento (con un motor de reintentos más completo). La decisión de diseño de abajo
> quedó satisfecha por ese trabajo; acá solo se documenta para que quede registrado por qué
> `tasks.md` 3.1/3.2 no tienen migración/processor propios de este change.

### 3. Código de error tipado en jobs BullMQ vía columna dedicada, no parseo de prefijo

`FiscalDocument` gana una columna `arcaErrorCode` (enum: `WSFE_REJECTED`, `TOTALS_MISMATCH`,
`TRANSIENT`, `UNKNOWN`), poblada junto con `arcaErrorMessage` en los mismos puntos donde hoy se
setea el mensaje (`fiscal-invoice.processor.ts`, catch de `WsfeRejectedError`, catch de totals
mismatch, y catch final antes de relanzar para retry de BullMQ — en ese último caso se persiste
`TRANSIENT` antes de relanzar, en vez de dejarlo solo en logs). Alternativa descartada: parsear el
prefijo de `arcaErrorMessage` en el frontend (`"WSFE_REJECTED: ".split(...)`) — se descarta porque
acopla el frontend a un formato de string interno y es lo mismo que ya se identificó como
antipatrón en `parseFiscalRetryError`. Costo: una migración TypeORM nueva (columna nullable,
backfill no necesario porque es solo hacia adelante).

### 4. Frontend: un solo `ErrorBoundary` de app, no uno por feature

Se monta un único `ErrorBoundary` genérico en `main.tsx` envolviendo el árbol de rutas. Alternativa
considerada: boundary por ruta (uno por página). Se descarta para este change por ser mayor
superficie sin beneficio claro hoy (no hay evidencia de que una sección deba sobrevivir a que otra
sección de la misma página falle); queda como posible refinamiento futuro si aparece un caso
concreto.

### 5. Toast con `sonner` vía shadcn, solo en `QueryCache.onError` — no en mutations

Se agrega `sonner` (dependencia nueva, requiere aprobación explícita de instalación por AGENTS.md
§6) porque es la integración de toast estándar de shadcn/ui, que ya es el sistema de componentes
del proyecto — evita traer una librería de UI distinta. El toast global se dispara desde
`QueryCache.onError` en `query-client.ts`, con un mecanismo de opt-out (`meta: {
skipGlobalErrorToast: true }` en la query) para las pantallas que ya manejan su propio error
inline y no quieren doble notificación.

> **Corrección post-smoke (8.2):** la versión original de esta decisión incluía también
> `MutationCache.onError` con el mismo mecanismo de opt-out. El smoke manual mostró que eso estaba
> mal calibrado para este codebase: ~36 archivos del frontend ya usan `mutateAsync` + `catch`
> inline para mostrar errores de mutation (no es un patrón raro, es LA convención existente). Un
> toast automático por default habría duplicado el mensaje en casi toda mutation de la app, no
> solo en las dos features migradas en el grupo 6. Se descartó `MutationCache.onError` por
> completo — las mutations siguen manejando su error como ya lo hacían, sin toast global. Solo las
> queries lo tienen por default, porque ahí el manejo inline es la excepción (dos casos
> conocidos), no la regla.

### 6. `parseApiError` único, tipado sobre `ApiErrorResponse`

Se centraliza en una función `parseApiError(error: unknown): ApiErrorResponse` (ubicación
propuesta: `apps/frontend/src/lib/errors/parse-api-error.ts`) que reemplaza la lógica de
`parseFiscalRetryError` y `parseCustomerPricingError`. Ambos parsers migran a llamar a la función
compartida y quedan, si necesitan lógica extra específica de su dominio, como una capa fina encima
en vez de reimplementar el parseo base.

## Risks / Trade-offs

- **[Riesgo]** Nueva columna en `FiscalDocument` toca una zona sensible del código (tabla
  fiscal, ver AGENTS.md §8) → **Mitigación**: columna nullable, sin backfill, sin cambiar
  columnas existentes; migración escrita y corrida solo en local por el agente, nunca contra
  staging/producción (AGENTS.md §6).
- **[Riesgo]** Doble notificación (toast global + manejo inline existente) en pantallas que no se
  migren al opt-out → **Mitigación**: el rollout agrega `skipGlobalErrorToast` a las pantallas que
  ya tienen manejo propio (`fiscal-alerts`, `customer-pricing`) como parte de este mismo change;
  el resto de pantallas no tiene manejo propio hoy, así que no hay duplicado ahí.
- **[Trade-off]** Formalizar el shape actual del filtro como tipo compartido implica que un cambio
  futuro al shape es ahora un cambio de tipo compartido (más visible, más difícil de romper sin
  darse cuenta) — se considera una mejora, no un costo neto.

## Migration Plan

1. `packages/shared-types`: agregar `ApiErrorResponse` y tipos de validación por campo. Sin
   impacto en runtime existente (solo tipos).
2. Backend: `exceptionFactory` en `ValidationPipe` — cambio de shape de `message`/`details` en
   errores 400 de validación. Frontend debe leer el nuevo `details` field-level; no rompe porque
   `message` legible se mantiene.
3. ~~Backend: migración TypeORM para `arcaErrorCode`~~ — entregado por `arca-contingency-engine`
   (ver nota post-implementación arriba); este change solo agrega la exposición en
   `FiscalDocumentResponseDto`/`SalesMapper`.
4. Frontend: agregar `sonner`, `ErrorBoundary`, `parseApiError`, `QueryCache.onError`. Cambio
   aditivo, no rompe pantallas existentes.
5. Frontend: migrar `fiscal-alerts` y `customer-pricing` a `parseApiError` + opt-out de toast
   global.
6. Frontend: agregar `Skeleton`/`EmptyState` y reemplazar en las tablas existentes.

Cada paso es un PR independiente y revisable (AGENTS.md §6: "un PR = una issue"); el orden de
`tasks.md` sigue esta secuencia.
