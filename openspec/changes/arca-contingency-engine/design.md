# Design

## Context

`FiscalInvoiceProcessor` (#224) ya toma un `pessimistic_write` lock sobre `FiscalDocument`, ya
reserva `documentNumber` antes de llamar a ARCA (`FiscalNumberingService.reserveNextNumber`), ya
persiste el resultado con un `UPDATE ... WHERE arcaStatus = PENDIENTE_FACTURACION` (idempotencia
básica), y ya distingue `WsfeRejectedError` (rechazo definitivo) de un mismatch de totales
(rechazo de validación) del resto de errores (tratados hoy como transitorios, sólo re-lanzados para
que BullMQ reintente con `attempts: 3` genéricos). `IArcaService.queryDocument` ya implementa
`FECompConsultar` con contrato `ArcaFiscalDocument | null` (existe con CAE / no existe) y lanza si
la consulta misma falla. Ver `proposal.md - Why` para la motivación completa.

Lo que falta: una política de backoff específica del issue, el uso de `queryDocument` en el camino
de retry, metadata de diagnóstico persistida, manejo explícito del agotamiento de reintentos, un
barrido de recuperación para documentos huérfanos, y la API administrativa.

## Goals / Non-Goals

**Goals:**

- Cambiar la política de reintentos de `wsfe-emit` a la secuencia del issue sin introducir un
  segundo mecanismo de exclusión mutua (se sigue usando el lock pesimista ya existente).
- Que Escenario A y B sean ramas explícitas de un mismo orquestador, no lógica dispersa en el
  processor.
- Que el agotamiento de reintentos sea una transición determinística a `RECHAZADO`, no un job que
  BullMQ simplemente abandona en silencio.
- Recuperar documentos huérfanos sin duplicar trabajo sobre un job que ya está activo/esperando.

**Non-Goals:**

- Pantalla `/admin/fiscal-alerts` ni ningún canal de notificación externo (US27-B).
- Cambiar el contrato de `IArcaService` (`requestCAE`/`queryDocument`/`getLastAuthorizedNumber`) —
  se reusa tal cual.
- Deduplicar o repriorizar jobs "para que corran ya"; el reintento manual respeta el backoff de un
  job ya encolado en vez de forzar su ejecución inmediata.
- Paginación por cursor en el barrido; un `LIMIT` simple por corrida es suficiente porque
  `updatedAt` no cambia hasta que el documento se procesa, así que el resto se recoge en la
  siguiente corrida.

## Decisions

### D1. `attempts: 6`, backoff exponencial base 30000 ms — no `attempts: 5`

BullMQ incrementa `job.attemptsMade` en cada fallo y calcula el delay exponencial como
`delay * 2^(attemptsMade - 1)` usando el `attemptsMade` **antes** del intento que se está por
correr. Con `delay: 30000`: antes del reintento 1 → 30s (2^0), reintento 2 → 60s, reintento 3 →
120s, reintento 4 → 240s, reintento 5 → 480s. Para que el quinto reintento (y su delay de 480s)
exista de verdad, la cola necesita 1 intento inicial + 5 reintentos = **6** intentos BullMQ. Con
`attempts: 5` sólo habría 4 reintentos (delays 30/60/120/240) y el job fallaría en firme en el
quinto intento sin usar 480s. El issue lista explícitamente los 5 delays, así que se prioriza esa
secuencia completa sobre el número literal "5 intentos" (que se interpreta como "5 reintentos").
Se usa el backoff `exponential` nativo de BullMQ (no uno custom) porque la fórmula estándar ya
produce exactamente esta secuencia.

_Alternativa descartada_: `attempts: 5` con backoff custom para forzar 5 delays de todas formas
(el quinto sin reintento posterior). Se descarta por ser más código para un resultado que
`attempts: 6` da gratis con la fórmula nativa.

### D2. Orquestador fiscal separado del processor BullMQ

`FiscalContingencyOrchestrator` (`apps/backend/src/modules/queue/services/fiscal-contingency-orchestrator.service.ts`)
recibe el `EntityManager` de la transacción abierta por el processor (mismo patrón que
`FiscalNumberingService.reserveWithManager`) y el `Job` de BullMQ, y devuelve un resultado
(`emitted | rejected | skipped | pending`). Encapsula:

1. Cargar el documento con el lock pesimista ya existente (se mantiene en el processor, que abre la
   transacción — el orquestador no abre transacciones, sólo las usa).
2. Si `arcaStatus !== PENDIENTE_FACTURACION` → `skipped` (idempotencia con documento ya resuelto).
3. Si `documentNumber` ya está asignado (intento previo dejó identidad reservada) → **Escenario B**:
   `queryDocument(...)` primero.
   - Devuelve documento con CAE → reconciliar: persistir ese CAE, `EMITIDO`, sin llamar
     `requestCAE`.
   - Devuelve `null` → continuar al paso 4 (emitir normal).
   - Lanza (consulta incierta) → tratar como falla transitoria de este intento (paso 5), **sin**
     llegar al paso 4.
4. Ejecutar el camino feliz existente (`requestCAE` con número reservado o recién reservado por
   `FiscalNumberingService`).
5. Clasificar cualquier error atrapado:
   - `WsfeRejectedError` → rechazo definitivo → `RECHAZADO` inmediato, `arca_error_code =
WSFE_REJECTED`, sin más reintentos.
   - Mismatch de totales (regex ya existente en el processor) → rechazo de validación →
     `RECHAZADO` inmediato, `arca_error_code = TOTALS_MISMATCH`.
   - Cualquier otro error (red, timeout, fault SOAP, consulta incierta) → transitorio. Si
     `job.attemptsMade + 1 >= (job.opts.attempts ?? 1)` (este es el último intento permitido) →
     `RECHAZADO`, `arca_error_code = RETRIES_EXHAUSTED`, **sin re-lanzar** (el job termina como
     `completed` con resultado `rejected`, evitando que BullMQ lo reintente o lo marque `failed` de
     forma que el barrido lo confunda con un huérfano). Si no es el último intento → persistir
     metadata (`attempt_count++`, `last_attempt_at`, `next_attempt_at` estimado,
     `failure_stage`, `arca_error_code = TRANSIENT`) y **re-lanzar** para que BullMQ programe el
     siguiente intento con el backoff configurado.

El processor BullMQ pasa a ser un adapter delgado: abre la transacción, delega en el orquestador,
y — sólo si el resultado es `emitted` — encola el job de PDF/QR post-commit (comportamiento
actual sin cambios).

`failure_stage` se determina así: `PRE_CAE` si el error ocurrió antes de recibir una respuesta de
`requestCAE` (incluye la falla de la propia consulta `queryDocument` cuando es incierta, porque el
documento sigue sin CAE); `POST_CAE` sólo aplica al caso, hoy inexistente en la práctica, de que el
error ocurra durante la persistencia posterior a un CAE ya obtenido (ver D4).

_Alternativa descartada_: mantener toda la lógica en el processor con más branches. Se descarta
porque el issue pide explícitamente "el processor delega y no contiene reglas de dominio
dispersas", y porque el orquestador aislado es testeable con un `EntityManager`/mock de
`IArcaService` sin levantar BullMQ.

### D3. Barrido de recuperación: `queue.getJob(jobId)` + remove-then-add para jobs terminales

`FiscalReconciliationSweepService` corre en `onModuleInit` del worker y luego cada
`ARCA_SWEEP_INTERVAL_MS` (default 5 min, configurable). Cada corrida:

1. `SELECT id, ... FROM fiscal_documents WHERE arca_status = 'PENDIENTE_FACTURACION' AND updated_at
< now() - ARCA_SWEEP_GRACE_PERIOD_MS ORDER BY updated_at ASC LIMIT ARCA_SWEEP_BATCH_SIZE` (grace
   period default 2 min: evita competir con un documento que otro proceso está por encolar/procesar
   en este mismo instante).
2. Para cada documento, `jobId = wsfe-emit-<fiscalDocumentId>` (mismo esquema determinista
   existente) y `queue.getJob(jobId)`:
   - No existe → huérfano real (falló el enqueue original) → `queue.add(...)` con ese `jobId`.
   - Existe y su estado (`job.getState()`) es `waiting`/`active`/`delayed` → **no tocar**, ya está
     en curso, se ignora (evita duplicar/interferir con un intento en progreso).
   - Existe y su estado es `completed`/`failed` (terminal — significa que agotó reintentos o
     quedó en un estado inconsistente antes de que existiera el manejo del paso D2.5) →
     `job.remove()` y luego `queue.add(...)` con el mismo `jobId` (BullMQ rechaza `add` con un
     `jobId` que pertenece a un job todavía existente, así que hay que removerlo primero).
3. El límite de lote y el orden por `updated_at` acotan cuánto Redis se toca por corrida; el resto
   se recoge en la corrida siguiente.

Este mismo par "verificar estado del job existente, remove-then-add si es terminal, no tocar si
está en curso" se extrae a un método reusable de `FiscalInvoiceQueueService`
(`requeue(fiscalDocumentId)`), porque el endpoint de reintento manual (D5) necesita exactamente la
misma semántica.

_Alternativa descartada_: usar `queue.add()` a ciegas confiando en que BullMQ ignora un `jobId`
duplicado. Es cierto para jobs `waiting`/`active`/`delayed`, pero BullMQ **lanza** si el `jobId`
pertenece a un job `completed`/`failed` que todavía no fue removido — hay que manejarlo
explícitamente o el barrido rompe con esos documentos.

### D4. Migración: columnas de metadata, no un estado nuevo

`ArcaStatus` no gana valores nuevos (`RECHAZADO` ya cubre agotamiento y rechazo definitivo, tal
como pide el issue). Nueva migración sobre `fiscal_documents`:

- `attempt_count integer NOT NULL DEFAULT 0`
- `last_attempt_at timestamptz NULL`
- `next_attempt_at timestamptz NULL`
- `failure_stage varchar(10) NULL` — `PRE_CAE` | `POST_CAE`, `CHECK` constraint.
- `arca_error_code varchar(40) NULL` — código estable (`WSFE_REJECTED`, `TOTALS_MISMATCH`,
  `TRANSIENT`, `RETRIES_EXHAUSTED`, `QUERY_UNCERTAIN`), separado de `arca_error_message` (que sigue
  siendo el texto sanitizado libre). Todas nullable/con default — aditiva, sin tocar filas
  existentes.

### D5. Reintento manual y automático convergen en `FiscalInvoiceQueueService.requeue`

`POST /sales/pending-fiscal/:id/retry`:

1. Carga el documento fuera de una transacción de venta (no hay side-effects comerciales que
   revertir). 404 si no existe.
2. 409/422 si `arcaStatus === EMITIDO` (nunca se reemplaza un CAE).
3. Si `arcaStatus === RECHAZADO`, transición corta `UPDATE ... SET arca_status =
PENDIENTE_FACTURACION WHERE id = :id AND arca_status = 'RECHAZADO'` (vuelve a ser trabajo
   recuperable) — si `PENDIENTE_FACTURACION` ya, no hace falta tocar el estado.
4. Auditoría (`AuditService.record`, patrón ya usado en `sales.service.ts`) con
   `fiscalDocumentId`, actor y el `jobId` resultante.
5. `fiscalInvoiceQueueService.requeue(fiscalDocumentId)` (mismo método que D3): si ya hay un job
   `waiting`/`active`/`delayed`, devuelve ese `jobId` sin duplicar nada (segunda llamada
   concurrente = mismo resultado, cumpliendo idempotencia); si no, lo crea o lo re-crea.

Como el lock pesimista del processor sigue siendo el único punto que efectivamente llama a ARCA,
un reintento manual y uno automático que coincidieran en el tiempo para el mismo documento
convergen igual: sólo uno adquiere el lock primero, el otro ve un `arcaStatus` ya resuelto y
termina en `skipped`.

## Risks / Trade-offs

- [`attempts: 6` es una interpretación, no lo literal del issue] → documentado en D1 con la
  fórmula exacta de BullMQ; si el owner técnico prefiere 5 intentos totales, es un cambio de una
  constante, no de arquitectura.
- [Barrido corre `queue.getJob` por documento, no en batch] → volumen esperado bajo (un comercio,
  lote acotado por config); aceptable para no introducir una API batch de BullMQ que no se
  necesita hoy.
- [`RETRIES_EXHAUSTED` hace que el job termine `completed` en vez de `failed`] → intencional: así
  el barrido no confunde "agotamiento ya manejado y persistido como RECHAZADO" con un huérfano; se
  documenta explícitamente para que un futuro test de "verificar RECHAZADO en logs de BullMQ" no
  busque un job `failed`.
- [Grace period de 2 min en el barrido] → un documento recién creado sin job todavía (encolado
  post-commit en curso) podría, en teoría, ser tocado por el barrido si su `updatedAt` fuera vieja
  por error de reloj; mitigado porque `updatedAt` se refresca en cada intento y en la creación.

## Migration Plan

- Migración TypeORM aditiva (columnas nullable/con default) sobre `fiscal_documents` — no requiere
  backfill, reversible con `down()` que las elimina.
- Cambio de `defaultJobOptions` en `FiscalInvoiceQueueService` (attempts/backoff) no requiere
  migración de datos; afecta sólo jobs nuevos encolados después del deploy.
- `FiscalReconciliationSweepService` se registra en `WorkerModule`; no requiere flag de
  habilitación — corre siempre que el worker está activo, igual que `FiscalInvoiceProcessor`.
- Rollback: revertir el commit deja la cola en la política de `attempts: 3` anterior y remueve el
  barrido; los documentos `PENDIENTE_FACTURACION` siguen siendo seguros de mantener sin él (mismo
  argumento que en `arca-fiscal-emission-cae`).
