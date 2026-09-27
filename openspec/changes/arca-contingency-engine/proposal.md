# Proposal

## Why

`FiscalInvoiceProcessor` (#224) resuelve el happy path de `wsfe-emit`, pero no tiene política de
reintentos fiscal ni reconciliación: la cola BullMQ hoy usa `attempts: 3` genéricos sin distinguir
falla transitoria de rechazo definitivo, un corte de red después de que ARCA ya autorizó el
comprobante puede terminar en una segunda emisión (doble CAE), y un documento que se queda
`PENDIENTE_FACTURACION` sin job activo (fallo de enqueue post-commit, reinicio del worker) no tiene
forma de recuperarse salvo intervención manual en la base. Tampoco hay visibilidad operativa
(conteos, listado, reintento manual) para que un Administrador actúe antes de US27-B.

## What Changes

- Configurar la cola `wsfe-emit` con `attempts: 6` y backoff exponencial base 30000 ms, de forma
  que los 5 reintentos automáticos (attemptsMade 1..5) den los delays 30/60/120/240/480 s pedidos
  por el issue; el intento inicial + 5 reintentos = 6 intentos BullMQ (ver design.md, decisión
  D1).
- Extraer un orquestador fiscal testeable (`FiscalContingencyOrchestrator` o equivalente) que
  encapsule: clasificación transitorio/definitivo, Escenario A (fallo pre-CAE), Escenario B
  (reconciliación post-CAE vía `FECompConsultar` antes de reintentar `FECAESolicitar`), y la
  transición final (`EMITIDO`/`RECHAZADO`/reprogramación). El processor BullMQ pasa a ser un
  adapter delgado que delega en el orquestador.
- Migración TypeORM que agrega a `fiscal_documents`: `attempt_count`, `last_attempt_at`,
  `next_attempt_at`, `failure_stage` (`PRE_CAE` | `POST_CAE`), `arca_error_code` (clasificación
  estable, no el mensaje SOAP crudo).
- Reusar `FiscalNumberingService` (ya persiste `documentNumber` antes de llamar a ARCA) e
  `IArcaService.queryDocument` (ya implementa `FECompConsultar`, contrato `null`/objeto/throw) sin
  tocar sus interfaces — el orquestador los consume tal cual.
- Reusar `WsfeRejectedError` como señal de rechazo fiscal definitivo; nueva clasificación de errores
  transitorios (red/timeout/5xx) vs definitivos vive en el orquestador, no duplicada en el
  processor.
- Barrido de recuperación (`FiscalReconciliationSweepService`) ejecutado al boot del worker y en un
  intervalo configurable: busca `FiscalDocument` en `PENDIENTE_FACTURACION` sin job BullMQ activo
  (`getJob(jobId)` ausente/`failed` terminal) y re-encola con el mismo `jobId` determinista,
  paginado y acotado por antigüedad/lote.
- `GET /sales/pending-fiscal` (ADMINISTRADOR) paginado, filtrable por `arcaStatus`/fecha/tipo de
  documento, con intentos/último error/timestamps.
- `POST /sales/pending-fiscal/:fiscalDocumentId/retry` (ADMINISTRADOR): idempotente — devuelve el
  job existente si ya está encolado, 404 si no existe el documento, 409/422 si ya está `EMITIDO` o
  no es reintentable; auditoría vía `AuditService` ya usado en `sales.service.ts`.
- `GET /sales/pending-fiscal/count` (ADMINISTRADOR) para badge — sólo conteos, sin secretos.
- Métricas mínimas de la cola (`waiting/active/delayed/failed`, pendientes/rechazados, antigüedad
  del pendiente más viejo), siguiendo el patrón de `QueueOpsController`/`OpsProbeQueueService`.
- Todos los mensajes de error persistidos/logueados pasan por `redactSecrets` (ya usado en el
  processor); ninguna respuesta ni log incluye XML/Token/Sign.

**Fuera de alcance** (no se toca en este change): WSAA/WSFE base y numeración (#224), PDF/QR
(#225), pantalla `/admin/fiscal-alerts` (US27-B), notificaciones externas (email/SMS/WhatsApp/
PagerDuty), edición de datos fiscales/cliente desde la bandeja, reversión de venta/stock/cuenta
corriente/devolución por falla ARCA, emisión productiva/Go-Live (#71).

## Capabilities

### New Capabilities

- `arca/wsfe-contingency-recovery`: política de reintentos BullMQ, clasificación transitorio vs
  definitivo, Escenario A/B de reconciliación pre/post-CAE, orquestador testeable, barrido de
  recuperación de documentos huérfanos.
- `sales/pending-fiscal-operations`: endpoints administrativos de listado/conteo/reintento manual
  de `FiscalDocument` pendientes o rechazados, con auditoría y métricas mínimas de cola.

### Modified Capabilities

(ninguna registrada en `openspec/specs/` — el change hermano `arca-fiscal-emission-cae` (#224) no
fue archivado/sincronizado todavía, por lo que no hay specs previos que modificar formalmente; este
change documenta el comportamiento de contingencia como capacidades nuevas.)

## Impact

- **Backend** (`apps/backend/src/modules/queue/**`): `FiscalInvoiceQueueService` (política de
  `defaultJobOptions`), nuevo orquestador y `FiscalReconciliationSweepService`, `WorkerModule`
  ejecuta el barrido al boot.
- **Backend** (`apps/backend/src/modules/sales/**`): nuevo controller/DTOs para
  `/sales/pending-fiscal*`, `FiscalDocument` entity con columnas nuevas.
- **Backend** (`apps/backend/src/modules/arca/**`): sin cambios de interfaz; se reusa
  `queryDocument`/`requestCAE`/`WsfeRejectedError` existentes.
- **DB**: nueva migración TypeORM sobre `fiscal_documents` (columnas de metadata de reintento).
- **`packages/shared-types`**: DTOs de request/response del endpoint de listado/reintento, enum de
  `failure_stage` si se expone al frontend.
- **Infra**: ninguna dependencia nueva (BullMQ/Redis ya provistos por #69).
