# Proposal

## Why

Hoy la emisión fiscal es automática: al confirmar una venta con "Requiere factura", el sistema encola la solicitud de CAE sin que el usuario vea antes qué comprobante va a emitirse ni pueda revisarlo. El usuario necesita ver un preview del comprobante (tipo, receptor, ítems, totales) antes de emitir, y disparar la emisión de forma explícita en vez de que ocurra sola al crear la venta.

## What Changes

- Se agrega un endpoint de preview que, dado un `FiscalDocument` en `PENDIENTE_FACTURACION`, devuelve el tipo de comprobante calculado (A/B, vía `InvoiceTypeResolverService`), datos del receptor, ítems y totales — sin llamar a ARCA ni reservar numeración.
- La creación de venta **deja de encolar automáticamente** el job `wsfe-emit` (**BREAKING** para cualquier consumidor que asuma emisión automática). El `FiscalDocument` queda en `PENDIENTE_FACTURACION` esperando confirmación manual.
- Se agrega un endpoint de emisión manual ("Emitir factura") que, sobre un `FiscalDocument` en `PENDIENTE_FACTURACION`, encola el job `wsfe-emit` — reutilizando el pipeline existente (`FiscalContingencyOrchestrator`, retry, PDF post-CAE) sin modificarlo.
- El admin API de `pending-fiscal` (listar/reintentar) sigue funcionando igual: documentos sin emitir manualmente aparecen ahí como pendientes, igual que hoy los que fallan al encolar.
- UI de venta: agrega vista de preview y botón "Emitir factura" en el flujo de venta/detalle de venta.
- Fuera de alcance: no se agrega selección de tipo de comprobante por el usuario (sigue siendo automático por reglas AFIP), no se rediseña el pipeline de CAE/PDF/contingencia.

## Capabilities

### New Capabilities

- `sales/fiscal-invoice-preview`: expone preview de comprobante (tipo calculado, receptor, ítems, totales) sin llamar a ARCA, para un `FiscalDocument` pendiente.
- `sales/manual-invoice-emission-trigger`: reemplaza el auto-enqueue en creación de venta por un endpoint de disparo manual que encola el job de emisión existente.

### Modified Capabilities

(ninguna — no hay specs archivadas aún para el flujo de emisión actual; el comportamiento existente vive solo en código, sin spec previa)

## Impact

- Backend: `apps/backend/src/modules/sales/sales.service.ts` (quitar auto-enqueue), nuevo controller/service de preview y de emisión manual en `sales` o `fiscal-documents`.
- Sin cambios en `apps/backend/src/modules/queue/**` (orchestrator, processor) ni en `invoice-type-resolver.service.ts` — se reutilizan tal cual.
- Frontend: `apps/frontend/src/features/sales` — nueva vista de preview + acción de emisión manual.
- Admin `pending-fiscal` API: sin cambios de contrato, pero el volumen de documentos "pendientes" listados crece (ahora incluye todos los no emitidos manualmente, no solo los que fallaron al encolar).
