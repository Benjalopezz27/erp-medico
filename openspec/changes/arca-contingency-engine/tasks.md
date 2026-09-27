# Tasks

## 1. Migración de base de datos

- [x] 1.1 Crear migración TypeORM que agregue a `fiscal_documents`: `attempt_count integer NOT NULL
DEFAULT 0`, `last_attempt_at timestamptz NULL`, `next_attempt_at timestamptz NULL`,
      `failure_stage varchar(10) NULL` con `CHECK (failure_stage IN ('PRE_CAE','POST_CAE'))`,
      `arca_error_code varchar(40) NULL`; con `down()` que las elimina; verificar con `pnpm
db:migrate` y `pnpm db:revert` locales sin error.
- [x] 1.2 Actualizar `FiscalDocument` entity con las columnas nuevas; verificar que
      `pnpm --filter backend build` compila.

## 2. Política de reintentos de la cola `wsfe-emit`

- [x] 2.1 Cambiar `defaultJobOptions` de `FiscalInvoiceQueueService` a `attempts: 6` con backoff
      `{ type: 'exponential', delay: 30000 }` (ver design.md D1); actualizar el comentario de la clase
      para documentar la secuencia de delays resultante; verificar con unit test que la `Queue` se
      crea con esas opciones.
- [x] 2.2 Agregar `FiscalInvoiceQueueService.requeue(fiscalDocumentId)`: si existe un job con el
      `jobId` determinista y su estado es `waiting`/`active`/`delayed`, devolver ese `jobId` sin
      tocarlo; si no existe o está `completed`/`failed`, removerlo (si existía) y agregarlo de nuevo;
      verificar con unit tests (mock de `bullmq`) los tres casos: sin job previo, job en curso, job
      terminal.

## 3. Orquestador de contingencia fiscal

- [x] 3.1 Crear `FiscalContingencyOrchestrator` (`apps/backend/src/modules/queue/services/fiscal-contingency-orchestrator.service.ts`)
      que reciba `EntityManager` + `Job` + documento ya bloqueado, e implemente Escenario B: si
      `documentNumber` ya está asignado, llamar `queryDocument` antes de `requestCAE`; verificar con
      unit tests: consulta devuelve CAE existente (reconcilia sin llamar `requestCAE`), consulta
      devuelve `null` (continúa a emisión normal), consulta lanza (no llama `requestCAE`, se trata como
      falla transitoria de ese intento).
- [x] 3.2 Implementar Escenario A dentro del orquestador: falla transitoria antes de CAE deja
      `PENDIENTE_FACTURACION`, persiste `attempt_count`/`last_attempt_at`/`next_attempt_at` estimado/
      `failure_stage=PRE_CAE`/`arca_error_code=TRANSIENT`, y re-lanza para que BullMQ reintente;
      verificar con unit test que un timeout simulado dos veces resulta en dos incrementos de
      `attempt_count` y el documento sigue `PENDIENTE_FACTURACION`.
- [x] 3.3 Implementar clasificación transitorio/definitivo reusando `WsfeRejectedError` (→
      `RECHAZADO`, `arca_error_code=WSFE_REJECTED`) y el mismatch de totales existente (→ `RECHAZADO`,
      `arca_error_code=TOTALS_MISMATCH`), ambos sin re-lanzar (no consumen reintentos adicionales);
      verificar con unit tests que ninguno de los dos casos vuelve a lanzar para BullMQ.
- [x] 3.4 Implementar agotamiento de reintentos: si la falla es transitoria y
      `job.attemptsMade + 1 >= (job.opts.attempts ?? 1)`, persistir `RECHAZADO` con
      `arca_error_code=RETRIES_EXHAUSTED` y devolver `rejected` sin re-lanzar (job termina
      `completed`, ver design.md D3 sobre por qué); verificar con unit test que simula 6 fallos
      transitorios consecutivos (vía llamadas directas al orquestador con `attemptsMade` creciente) y
      que sólo el sexto persiste `RECHAZADO`.
- [x] 3.5 Verificar no-op idempotente: reprocesar un documento ya `EMITIDO` no llama a ARCA ni
      modifica CAE (test ya cubierto en #224, extender si hace falta con el nuevo orquestador).
- [x] 3.6 Refactorizar `FiscalInvoiceProcessor.processWithLock` para delegar en el orquestador
      (adapter delgado: abre transacción/lock, llama al orquestador, maneja el enqueue de PDF
      post-commit sólo si `emitted`); verificar que los tests existentes de `fiscal-invoice.processor.spec.ts`
      siguen pasando con la lógica movida.

## 4. Barrido de recuperación de documentos huérfanos

- [x] 4.1 Crear `FiscalReconciliationSweepService` con método `sweep()`: selecciona
      `FiscalDocument` `PENDIENTE_FACTURACION` con `updatedAt < now() - ARCA_SWEEP_GRACE_PERIOD_MS`
      (env, default 120000), ordenado por `updatedAt ASC`, límite `ARCA_SWEEP_BATCH_SIZE` (env, default
      50); para cada uno, usar la lógica de `requeue` (tarea 2.2) vía `FiscalInvoiceQueueService`;
      verificar con unit test que un documento sin job (`getJob` devuelve `undefined`) se re-encola, y
      uno con job `active` no se toca.
- [x] 4.2 Registrar `sweep()` en `onModuleInit` de `WorkerModule` y en un `setInterval` con el
      período configurado, limpiando el interval en `onModuleDestroy`; verificar con test de
      integración liviano que el worker arranca, corre un `sweep()` inicial y no lanza si la tabla está
      vacía.
- [x] 4.3 Test de reinicio simulado: crear un `FiscalDocument` `PENDIENTE_FACTURACION` sin job en
      Redis (simulando un enqueue fallido), correr `sweep()`, verificar que queda un job encolado con el
      `jobId` determinista.

## 5. API administrativa de documentos fiscales pendientes

- [x] 5.1 Agregar DTOs (`QueryPendingFiscalDto`, `PendingFiscalDocumentResponseDto`,
      `PaginatedPendingFiscalResponseDto`) en `packages/shared-types` o en el módulo de sales según el
      patrón existente de `QuerySalesDto`/`PaginatedSalesResponseDto`; verificar que el workspace
      compila.
- [x] 5.2 Crear `PendingFiscalController` (o método en `SalesController`) con `GET
/sales/pending-fiscal` (ADMINISTRADOR, paginado, filtros por `arcaStatus`/fecha/`documentType`,
      incluye `attemptCount`/`lastAttemptAt`/`nextAttemptAt`/`arcaErrorMessage`); verificar con unit
      tests: sin filtros, con filtros combinados, y 403 sin rol ADMINISTRADOR.
- [x] 5.3 Agregar `GET /sales/pending-fiscal/count` (ADMINISTRADOR) con conteo de
      `PENDIENTE_FACTURACION` y `RECHAZADO`; verificar con unit test los conteos sobre datos de fixture.
- [x] 5.4 Agregar `POST /sales/pending-fiscal/:fiscalDocumentId/retry` (ADMINISTRADOR): 404 si no
      existe, 409/422 si `EMITIDO`, transición `RECHAZADO → PENDIENTE_FACTURACION` si aplica, llama
      `requeue`, registra auditoría (`AuditService.record` con `fiscalDocumentId`/`jobId`/actor);
      verificar con unit tests los 4 casos (pendiente sin job, pendiente con job activo → mismo jobId,
      rechazado → vuelve a pendiente y se reencola, emitido → 409/422) y que la auditoría se registra
      sólo en el caso exitoso.
- [x] 5.5 Extender métricas de cola (patrón `QueueOpsController`/`OpsProbeQueueService`) para
      incluir `wsfe-emit` (`waiting/active/delayed/failed`) y antigüedad del pendiente más viejo;
      verificar con unit test que la antigüedad refleja el `createdAt` mínimo entre los pendientes.
- [x] 5.6 Documentar los endpoints nuevos en Swagger; verificar que la especificación generada
      incluye los tres endpoints con sus DTOs.

## 6. Pruebas end-to-end y regresión

- [x] 6.1 E2E Escenario A: mock de ARCA falla transitoriamente 3 veces, emite en el 4to intento;
      venta permanece `CONFIRMADA` durante todo el proceso.
- [x] 6.2 E2E Escenario B: documento con `documentNumber` ya reservado, mock de `queryDocument`
      devuelve CAE existente → se persiste ese CAE sin una segunda llamada a `requestCAE` (asertar con
      spy/contador de invocaciones).
- [x] 6.3 E2E: `queryDocument` devuelve `null` → emite una sola vez; `queryDocument` lanza → no
      emite en ese intento (spy de `requestCAE` con 0 invocaciones en ese intento).
- [x] 6.4 E2E: 5 fallos transitorios consecutivos (`attempts: 6` agotados) → documento `RECHAZADO`
      con `arca_error_code=RETRIES_EXHAUSTED`, `attempt_count` y último error persistidos.
- [x] 6.5 E2E: rechazo fiscal definitivo (`WsfeRejectedError`) en el primer intento → `RECHAZADO`
      inmediato, sin reintentos programados (verificar `attempt_count` bajo o job sin reintentos
      pendientes en la cola).
- [x] 6.6 E2E: reprocesar job de documento `EMITIDO` → no-op, CAE sin cambios.
- [x] 6.7 E2E: retry manual (`POST /sales/pending-fiscal/:id/retry`) mientras hay un job automático
      `delayed` para el mismo documento → misma respuesta de `jobId`, sin segundo job en la cola.
- [x] 6.8 E2E: documento huérfano (enqueue fallido simulado, sin job en Redis) → `sweep()` lo
      recupera y termina `EMITIDO` tras procesar el job re-encolado.
- [x] 6.9 E2E: aplicar los mismos escenarios A/B a una Nota de Crédito A/B (no sólo Factura).
- [x] 6.10 Test de contrato HTTP: `GET /sales/pending-fiscal` (200/403), `GET
/sales/pending-fiscal/count` (200/403), `POST /sales/pending-fiscal/:id/retry`
      (200/202/401/403/404/409/422).
- [x] 6.11 Test de sanitización: forzar un error con datos sensibles simulados (Token/Sign/XML) y
      verificar que ni el `arca_error_message` persistido ni ninguna respuesta HTTP los contiene.
- [x] 6.12 Correr `pnpm run format:check && pnpm -r run lint && pnpm test && pnpm build` (mismo
      orden que CI) y dejar constancia de que todo pasa antes de abrir el PR. `format:check`/`lint`/
      `test` (backend 113/113, frontend 183/183) y el build de `shared-types`/`backend` pasan
      limpios. El build de `apps/frontend` falla por un error de tipos preexistente en
      `features/fiscal-alerts` (fixtures de `IFiscalDocument` sin `pdfStatus`/`qrAvailable`),
      verificado con `git stash` como ya roto en `sprint/8` antes de este change — fuera de alcance
      de #226 (UI de US27-B), no se toca acá.
