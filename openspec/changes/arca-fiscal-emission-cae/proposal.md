# Proposal

## Why

Las ventas confirmadas y las notas de crédito por devolución quedan con `FiscalDocument` en
`PENDIENTE_FACTURACION` indefinidamente: no existe ningún disparador que solicite el CAE a ARCA.
`ArcaHomologationService.requestCAE()`/`queryDocument()` están fail-closed desde #69 ("reservado
para Sprint 8"), y no hay cola/worker que los invoque de forma asíncrona y trazable. Sin esto, el
negocio sigue cargando Facturas A/B manualmente y el resultado fiscal de cada venta es ambiguo.

## What Changes

- Completar `ArcaHomologationService` para WSFE: `FECompUltimoAutorizado`, `FECAESolicitar`,
  `FECompConsultar`, siguiendo el mismo patrón (XML + `https.request` + parseo liviano, sin
  librería SOAP) usado hoy para WSAA.
- Resolver autoritativamente Factura A vs B a partir de `Customer.taxCondition`/`documentType`
  (persistido) y la condición fiscal del emisor (config), sin aceptar tipo/importes del frontend.
- Cachear el ticket WSAA (Token/Sign) en Redis, compartido entre proceso API y worker, con TTL
  máximo de 12 h y margen de renovación — reemplaza el caché en memoria por proceso de #69.
- Construir el request fiscal desde snapshots persistidos (venta, cliente, ítems, netos, IVA,
  total) reutilizando `buildFiscalAmounts`/`validateFiscalAmounts` (`fiscal-amounts.util.ts`).
- Serializar la asignación del próximo número de comprobante por punto de venta + tipo, para que
  dos jobs concurrentes no colisionen.
- Crear la cola `wsfe-emit` (BullMQ) y su processor en el proceso worker, con `jobId` determinista
  por `fiscalDocumentId` para que reintentos/duplicados converjan al mismo resultado.
- Encolar el job sólo después del commit de la transacción de venta o devolución (nunca dentro de
  ella); si Redis no está disponible al encolar, el documento queda `PENDIENTE_FACTURACION` para
  que US27-A lo recupere — no se revierte venta/stock/cuenta corriente.
- En éxito, persistir atómicamente tipo, punto de venta, número, CAE, vencimiento, `issuedAt` y
  estado `EMITIDO`, sin tocar `Sale.status`.
- Emitir Notas de Crédito A/B (creadas por #211) usando el tipo/punto de venta de la factura
  original.
- Exponer `GET /sales/:id/fiscal-document` (ADMINISTRADOR, VENDEDOR) con el estado y datos
  fiscales autorizados.
- Actualizar Swagger y `shared-types` con los contratos estables resultantes.

**Fuera de alcance** (no se toca en este change): PDF/QR/descarga (US26-B), backoff/reintentos
automáticos/reconciliación/recuperación de jobs huérfanos (US27-A), bandeja de alertas (US27-B),
certificado/punto de venta productivo (#71).

## Capabilities

### New Capabilities

- `arca/wsfe-invoice-emission`: emisión asíncrona de comprobantes fiscales (Factura A/B, Nota de
  Crédito A/B) vía WSFE — resolución de tipo, numeración serializada, construcción del request
  fiscal, cola/worker `wsfe-emit`, y persistencia atómica del resultado (CAE o rechazo).
- `arca/wsaa-shared-ticket-cache`: caché compartida en Redis del ticket de acceso WSAA (Token/Sign)
  entre los procesos API y worker, con TTL y margen de renovación.
- `sales/fiscal-document-query`: endpoint de lectura autenticado del estado y datos fiscales de
  una venta (`GET /sales/:id/fiscal-document`).

### Modified Capabilities

(ninguna — no existen specs previos en `openspec/specs/`; este es el primer change que documenta
comportamiento fiscal formalmente.)

## Impact

- **Backend** (`apps/backend/src/modules/arca/**`): `ArcaHomologationService` (WSFE), nuevo
  servicio de resolución de tipo de comprobante, nuevo servicio de ticket compartido (Redis).
- **Backend** (`apps/backend/src/modules/queue/**`): nueva cola/processor `wsfe-emit`, wiring en
  `QueueModule`/`WorkerModule`/`SalesModule`.
- **Backend** (`apps/backend/src/modules/sales/**`): `SalesService.create()` y
  `SaleReturnsService` encolan el job post-commit; nuevo endpoint en `SalesController`.
- **DB**: posible migración incremental sobre `fiscal_documents` si se requiere un campo adicional
  para numeración reservada/idempotencia (a confirmar en design.md).
- **`packages/shared-types`**: nuevos tipos de respuesta para el endpoint de consulta.
- **Infra**: ninguna nueva dependencia (Redis y BullMQ ya provistos por #69); no se agrega
  librería SOAP.
