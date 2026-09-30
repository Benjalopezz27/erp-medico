# Proposal

## Why

`#224` (`arca-fiscal-emission-cae`, mergeado en `sprint/8`) deja `FiscalDocument` en `EMITIDO`
con tipo, punto de venta, número, CAE y vencimiento persistidos, pero no genera ningún artefacto
documental: `qrCodeData` existe en la entidad desde #224 pero ningún código lo escribe, no hay
columna ni tabla para el PDF, y `/sales/:id` no ofrece "Descargar PDF" ni "Ver QR" pese a que el
wireframe `docs/wireframes/24_sale_detail.md` ya los define. El negocio sigue sin poder entregar
ni verificar el comprobante fiscal sin salir del ERP.

## What Changes

- Construir el payload oficial del QR fiscal (RG 4291/2018 AFIP: `ver`, `fecha`, `cuit`, `ptoVta`,
  `tipoCmp`, `nroCmp`, `importe`, `moneda`, `ctz`, `tipoDocRec`, `nroDocRec`, `tipoCodAut`,
  `codAut`) a partir exclusivamente de datos ya persistidos en `FiscalDocument`/`Sale`/`Customer`,
  codificarlo de forma determinista (JSON canónico + base64 en la URL `https://www.afip.gob.ar/fe/qr/?p=...`)
  y persistirlo en la columna `qrCodeData` ya existente.
- Agregar columnas nuevas a `fiscal_documents` para el artefacto PDF: datos binarios, checksum,
  tamaño, versión de template, estado de generación (`PENDIENTE`, `GENERANDO`, `DISPONIBLE`,
  `ERROR`) y mensaje de error — ver `design.md` para el detalle exacto.
- Agregar las dependencias `pdf-lib` (PDF, sin motor de render de navegador) y `qrcode` (imagen QR
  determinista) al backend.
- Crear la cola `pdf-generate` (BullMQ) y su processor en el worker, encolado únicamente después de
  que `FiscalInvoiceProcessor` persiste `EMITIDO` (nunca antes, nunca para un documento sin CAE).
- El processor de `pdf-generate` es idempotente por `fiscalDocumentId` (mismo patrón de `jobId`
  determinista + no-op en el consumer que `wsfe-emit`) y sólo regenera el artefacto si la versión
  de template o el checksum de los datos fuente cambiaron.
- Generar el template fiscal versionado (emisor/receptor, tipo y número formateado, fecha, ítems,
  netos, IVA, total, CAE, vencimiento, imagen QR embebida) reproduciendo los snapshots fiscales
  históricos de la venta (nunca precios/datos maestros actuales).
- Extender `FiscalDocumentResponseDto` con disponibilidad del artefacto (estado, tamaño, fecha de
  generación) sin transferir binarios en el JSON de la venta.
- Exponer `GET /sales/:id/fiscal-document/pdf` (streaming, `Content-Type: application/pdf`,
  `Content-Disposition` con nombre derivado de tipo+número sanitizados, sin URLs públicas) y
  `GET /sales/:id/fiscal-document/qr` (imagen QR) en `SalesController`, mismos guards de clase
  (`JwtAuthGuard`, `RolesGuard`, roles ADMINISTRADOR/VENDEDOR) que el endpoint de consulta de #224.
- Integrar en `SaleDetailView.tsx` la sección "Comprobante Fiscal" con acciones "Descargar PDF" y
  "Ver QR" (modal), condicionadas al estado del artefacto, reutilizando `FiscalStatusBadge` y el
  patrón de query keys de `sales-keys.ts`.
- Mostrar en `SaleReturnsHistoryTable.tsx` el acceso documental de la Nota de Crédito cuando su
  `FiscalDocument` esté `EMITIDO` y con artefacto disponible.

**Fuera de alcance** (no se toca en este change): WSAA/WSFE/numeración/CAE (#224, ya cerrado);
reintentos de una emisión fiscal fallida (US27-A/US27-B); bandeja administrativa de alertas
(US27-B); envío automático por email/WhatsApp, impresión directa o firma digital del PDF; portal
público de consulta o URLs permanentes sin autenticación; object storage externo (decisión
separada si el volumen futuro lo requiere); diseño de factura productivo definitivo sujeto a
branding del cliente.

## Capabilities

### New Capabilities

- `sales/fiscal-artifact-generation`: construcción determinista del payload QR oficial, template
  PDF versionado, cola/worker `pdf-generate` idempotente encadenada post-CAE, y persistencia
  binaria durable con checksum/versión para auditoría y regeneración controlada.
- `sales/fiscal-document-delivery`: endpoints autenticados de descarga de PDF y consulta de QR sin
  exponer binarios en JSON ni URLs públicas, extensión del contrato de detalle fiscal con
  disponibilidad del artefacto, e integración en `/sales/:id` y en el historial de devoluciones.

### Modified Capabilities

- `sales/fiscal-document-query` (de `arca-fiscal-emission-cae`): `FiscalDocumentResponseDto` gana
  campos de disponibilidad de artefacto (sin binarios).

## Impact

- **Backend** (`apps/backend/src/modules/sales/**`): nuevos campos en `fiscal-document.entity.ts`,
  servicio de payload QR, servicio de generación de PDF (template), nuevos endpoints en
  `SalesController`, mapper/DTO extendido.
- **Backend** (`apps/backend/src/modules/queue/**`): nueva cola/processor `pdf-generate`, wiring en
  `QueueModule`/`QueueConsumerModule`/`WorkerModule`.
- **Backend** (`apps/backend/src/modules/arca/**`): sin cambios funcionales; se lee
  `CBTE_TIPO_BY_DOCUMENT_TYPE` y config de CUIT/punto de venta ya existentes para el payload QR.
- **DB**: migración aditiva sobre `fiscal_documents` (columnas de artefacto PDF; `qrCodeData` ya
  existe, no requiere migración).
- **`packages/shared-types`**: `FiscalDocumentResponseDto`/`IFiscalDocument` extendidos con
  disponibilidad de artefacto.
- **Frontend** (`apps/frontend/src/features/sales/**`): `SaleDetailView.tsx`,
  `SaleReturnsHistoryTable.tsx`, nuevo hook/query-key de artefacto, componente de modal QR.
- **Dependencias nuevas**: `pdf-lib`, `qrcode` (backend); ninguna en frontend (QR se sirve como
  imagen desde el backend, no se genera en el navegador).
