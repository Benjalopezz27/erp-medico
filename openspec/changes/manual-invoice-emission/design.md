# Design

## Context

`SalesController` ya expone la familia de rutas `sales/:id/fiscal-document`, `fiscal-document/pdf` y `fiscal-document/qr`, todas bajo `@Roles(ADMINISTRADOR, VENDEDOR)` (`apps/backend/src/modules/sales/sales.controller.ts:78-121`). El auto-enqueue vive en `SalesService.create()`, después de confirmar la transacción de venta (`apps/backend/src/modules/sales/sales.service.ts:253-267`).

El pipeline de emisión manual **ya existe**, pero solo expuesto a `ADMINISTRADOR` como herramienta de recuperación: `PendingFiscalController` (`sales/pending-fiscal/:fiscalDocumentId/retry`) delega en `PendingFiscalService.retry()`, que valida estado (`RETRYABLE_STATUSES` incluye `PENDIENTE_FACTURACION` y `RECHAZADO`, rechaza `EMITIDO` con 409, rechaza otros estados con 422) y llama a `FiscalInvoiceQueueService.requeue()` — que es idempotente por `jobId` determinístico (`wsfe-emit-<fiscalDocumentId>`): si ya hay un job `waiting`/`active`/`delayed`, no crea uno nuevo. `InvoiceTypeResolverService.resolve()` es una función pura y sin efectos (no llama a ARCA, no reserva numeración), apta para preview tal cual está.

Ver proposal.md para el motivo del cambio.

## Goals / Non-Goals

**Goals:**

- Reutilizar el pipeline de emisión/contingencia/PDF existente sin tocarlo.
- Reutilizar `PendingFiscalService.retry()` como motor del disparo manual, en vez de reimplementar la lógica de encolado/idempotencia.
- Exponer preview y emisión manual con el mismo nivel de acceso que ya tiene la creación de ventas (`ADMINISTRADOR`, `VENDEDOR`), no solo admin.

**Non-Goals:**

- No cambia `InvoiceTypeResolverService`, `FiscalContingencyOrchestrator`, `FiscalInvoiceProcessor` ni el procesamiento de PDF.
- No cambia el contrato del API `pending-fiscal` admin existente.
- No agrega selección de tipo de comprobante por el usuario.

## Decisions

**D1 — Preview: cálculo directo, sin nuevo servicio.**
El endpoint de preview llama a `InvoiceTypeResolverService.resolve()` con la condición fiscal del cliente de la venta (ya cargado por `SalesService.findOne`/`loadDetail`) y arma la respuesta con los ítems/totales que ya están persistidos en `Sale` (`totalNet`, `ivaTotal`, `totalGross`, items). No se agrega un servicio nuevo de cálculo: se reutiliza lo que ya carga `findOne`.
Alternativa descartada: recalcular ítems/totales desde cero en el preview — innecesario, la venta ya persiste esos valores al confirmarse.

**D2 — Emisión manual: delega en `PendingFiscalService.retry()`, no reimplementa encolado.**
El nuevo endpoint de emisión (`POST sales/:id/fiscal-document/emit`) llama a `pendingFiscalService.retry(fiscalDocumentId, userId)`. Se obtienen gratis: el chequeo 409 si ya está `EMITIDO`, el chequeo 422 si el estado no es reintentable, la transición `RECHAZADO → PENDIENTE_FACTURACION`, la idempotencia por `jobId`, y el registro de auditoría.
Alternativa descartada: escribir un enqueue nuevo en `SalesService` — hubiera duplicado el estado/idempotencia que `PendingFiscalService`/`FiscalInvoiceQueueService` ya resuelven, violando el pipeline único que pide la propuesta.
Riesgo de acoplamiento: `PendingFiscalService` fue pensado como herramienta de admin; se lo inyecta también en `SalesController`/`SalesService`. Ambos ya viven en `SalesModule`, no hay import circular.

**D3 — Se elimina el auto-enqueue, no se lo pone detrás de un flag.**
Se borra el bloque `try { enqueueCaeRequest(...) } catch` de `SalesService.create()` (sales.service.ts:253-267). Es un ERP interno de uso propio, sin necesidad de feature flag ni rollout gradual — un solo deploy coordinado de backend + frontend alcanza.

**D4 — Mismos roles que hoy crean ventas.**
Preview y emisión manual quedan bajo el `@Roles(ADMINISTRADOR, VENDEDOR)` que ya tiene `SalesController` a nivel de clase. No se introduce un rol más restrictivo para "emitir" que para "vender" (ver Open Questions).

## Risks / Trade-offs

- [El panel `pending-fiscal` va a mostrar TODAS las ventas con factura requerida como "pendientes" hasta que alguien las emita manualmente, no solo las que fallaron] → Mitigación: es el comportamiento buscado por la propuesta; el panel ya soporta paginado/filtrado por estado, no requiere cambios.
- [Doble click en "Emitir factura" desde dos pestañas/usuarios distintos] → Mitigación: ya cubierto por la idempotencia de `jobId` en `FiscalInvoiceQueueService.requeue()`, sin cambios necesarios.
- [Usuario cierra la venta sin emitir y se olvida] → Mitigación: fuera de alcance de este change; el admin ya puede detectarlo y reintentar vía `pending-fiscal`. Un recordatorio proactivo queda para una propuesta futura si se necesita.

## Migration Plan

1. Backend: agregar endpoints de preview y emisión manual al `SalesController` existente; borrar el auto-enqueue en `SalesService.create()`.
2. Frontend: agregar vista de preview + botón "Emitir factura" en el detalle/flujo de venta.
3. Deploy conjunto backend+frontend (rompe compatibilidad si se despliega solo uno: con backend nuevo y frontend viejo, ninguna venta se factura hasta que el usuario entre al admin panel a reintentar).
4. Rollback: revertir el commit que borra el auto-enqueue: ventas cuyo `FiscalDocument` quedó `PENDIENTE_FACTURACION` sin emitir se recuperan vía `pending-fiscal/retry` existente, sin pérdida de datos.

## Open Questions

- ¿"Emitir factura" debe restringirse a un rol más acotado que crear ventas (por ejemplo, requerir supervisor), o alcanza con los mismos roles que hoy confirman ventas (`ADMINISTRADOR`, `VENDEDOR`)? Este change asume que son los mismos roles (D4); se puede acotar más adelante sin tocar specs ni el enfoque general.
