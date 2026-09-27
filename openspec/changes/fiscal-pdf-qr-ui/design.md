# Design

## Context

`fiscal_documents` (`apps/backend/src/modules/sales/entities/fiscal-document.entity.ts:16-81`) ya
tiene `documentType`, `pointOfSale`, `documentNumber`, `cae`, `caeExpirationDate`, `arcaStatus`
(`EMITIDO|PENDIENTE_FACTURACION|RECHAZADO`), `issuedAt` y `qrCodeData` (nullable, sin escritor).
`FiscalInvoiceProcessor` (`fiscal-invoice.processor.ts:177-207`) persiste el `UPDATE` atómico a
`EMITIDO` dentro de `processWithLock`, condicionado a `WHERE arcaStatus = PENDIENTE_FACTURACION`.
`FiscalInvoiceQueueService`/`FiscalInvoiceProcessor` establecen el patrón a replicar: `jobId`
determinista `wsfe-emit-{fiscalDocumentId}`, `QueueConsumerModule` como home de processors del
worker, no-op si el estado ya no aplica. No existe ninguna librería de PDF/QR en el repo. Ver
`proposal.md - Why` para la motivación completa.

## Goals / Non-Goals

**Goals:**

- Generar el QR con el contrato oficial de AFIP (RG 4291/2018) reproducible/decodificable, sin
  depender del navegador.
- Persistir el PDF como artefacto binario durable en la propia base de datos (sin filesystem
  efímero, sin proveedor externo no aprobado), con checksum/versión para auditoría y
  regeneración.
- Encadenar la generación documental estrictamente después del CAE, sin poder invalidarlo ni
  reemitir ante ARCA por una falla de PDF.
- Servir PDF/QR por endpoints autenticados en streaming, sin binarios en el JSON de venta y sin
  URLs públicas.

**Non-Goals:**

- Object storage externo (S3/GCS) — decisión/gate separado si el volumen lo requiere.
- Reintento administrativo de una emisión fiscal fallida (US27-A/US27-B); este change sólo cubre
  reintento de la generación documental para un documento ya `EMITIDO`.
- Envío automático (email/WhatsApp), impresión directa o firma digital del PDF.
- Diseño de factura productivo definitivo (branding); se usa un template funcional versionado.

## Decisions

### 1. Payload QR: JSON canónico + base64 en URL oficial, sin dependencia externa

Servicio `FiscalQrPayloadService` construye el objeto AFIP:

```json
{
  "ver": 1,
  "fecha": "2026-08-24",
  "cuit": 20345678901,
  "ptoVta": 3,
  "tipoCmp": 6,
  "nroCmp": 102,
  "importe": 15000.5,
  "moneda": "PES",
  "ctz": 1,
  "tipoDocRec": 80,
  "nroDocRec": 20123456789,
  "tipoCodAut": "E",
  "codAut": 73000012345678
}
```

- `tipoCmp` sale de `CBTE_TIPO_BY_DOCUMENT_TYPE` (`wsfe-soap-client.service.ts:13-21`), ya usado
  por WSFE — mismo mapeo, cero riesgo de divergencia.
- `cuit`, `ptoVta`, `nroCmp`, `codAut` (CAE), `fecha` (`issuedAt`) e `importe` (`totalAmount` del
  snapshot fiscal de la venta) salen de columnas ya persistidas; nada se recalcula desde precios
  actuales.
- `tipoDocRec`/`nroDocRec` salen de `Customer.documentType`/`documentNumber` (0/sin dato →
  Consumidor Final: `99`/`0` según tabla AFIP).
- Serialización: `JSON.stringify` con orden de claves fijo (no `Object.keys` del objeto libre,
  sino un array de claves hardcodeado) para que el mismo comprobante produzca siempre el mismo
  payload — determinismo requerido para auditoría/regeneración.
- URL final: `https://www.afip.gob.ar/fe/qr/?p=` + `Buffer.from(json).toString('base64')`. Esta
  URL string es lo que se persiste en `qrCodeData` (columna ya existente, no requiere migración).
- El endpoint `GET /sales/:id/fiscal-document/qr` no redirige a esa URL: renderiza el QR (imagen
  PNG) codificando esa misma URL con `qrcode.toBuffer()`, servido inline — no se expone la URL
  fiscal cruda en una respuesta pública, sólo la imagen tras autenticación.

_Alternativa descartada_: generar el QR en el frontend (librería JS de QR + fetch del payload).
Se descarta porque el PDF (backend) también necesita la imagen embebida, y duplicar la
codificación en dos lugares arriesga divergencia entre el QR del PDF y el QR "Ver QR" en pantalla.

### 2. PDF: `pdf-lib`, no motor de navegador

`pdf-lib` (JS puro, sin Chromium/puppeteer) genera el PDF por composición programática
(texto, tablas simples, imagen QR embebida como PNG). Se descarta `puppeteer`/`playwright` por
ser la opción más pesada y menos determinista (requiere Chromium en el worker, renderizado HTML
no es necesario para un layout tabular fijo). Se descarta `pdfkit` por preferir la API inmutable
de `pdf-lib` (documento como buffer, sin streams a manejar en el worker) — decisión de estilo, no
de capacidad; ambas cumplen el rung 7 de "mínimo código que funciona".

`FiscalPdfTemplateService` recibe: datos de emisor (config `ARCA_CUIT`/razón social/condición
fiscal), snapshot de receptor (`Customer` al momento de la venta — nombre, CUIT/DNI, condición
fiscal, tal como quedó persistido en la venta, no el `Customer` actual), tipo/número formateado,
fecha, ítems/cantidades/netos/IVA/total (snapshot fiscal existente, mismo origen que
`buildFiscalAmounts`), CAE, vencimiento, imagen QR. Constante `PDF_TEMPLATE_VERSION = 'v1'`
(string, no derivado de nada) versiona el layout — un cambio de layout futuro sube esta constante,
lo que fuerza regeneración vía la tarea 4.4.

### 3. Persistencia binaria: columnas nuevas en `fiscal_documents`, no tabla aparte

Se agregan a `fiscal_documents`: `pdf_data` (`bytea`, nullable), `pdf_checksum` (`varchar(64)`,
SHA-256 hex, nullable), `pdf_size_bytes` (`int`, nullable), `pdf_template_version` (`varchar(10)`,
nullable), `pdf_generated_at` (`timestamptz`, nullable), `pdf_status` (`varchar(20)`, default
`'PENDIENTE'`, valores `PENDIENTE|GENERANDO|DISPONIBLE|ERROR`), `pdf_error_message` (`text`,
nullable).

_Alternativa descartada_: tabla separada `fiscal_document_artifacts` (1:1). Se descarta por YAGNI
— no hay hoy un caso de uso que liste artefactos sin su documento fiscal, y una tabla nueva sólo
suma un join a cada lectura sin beneficio; si en el futuro se necesitan múltiples versiones
históricas del PDF, ahí se justifica la tabla y se migra.

`pdf_status` es independiente de `arcaStatus`: un documento puede estar `arcaStatus: EMITIDO` con
`pdf_status: ERROR` (falla de PDF no invalida el CAE) o `pdf_status: GENERANDO` mientras el job
corre. El frontend deriva el estado combinado a mostrar (`PENDIENTE_FACTURACION`, `EMITIDO` sin
artefacto todavía, artefacto disponible, error recuperable de documento) de estos dos campos, sin
un quinto estado enumerado nuevo en el backend.

### 4. Cola `pdf-generate`: mismo patrón que `wsfe-emit`, encadenada post-CAE

`PdfGenerateQueueService` (producer) + `PdfGenerateProcessor` (consumer, `QueueConsumerModule`),
`jobId = "pdf-generate-" + fiscalDocumentId`. Encolado desde el branch de éxito de
`FiscalInvoiceProcessor.processWithLock` (`fiscal-invoice.processor.ts:219`, después del `UPDATE`
que persiste `EMITIDO`), en un `try/catch` que sólo loguea — igual que el patrón post-commit de
`SalesService.create()`. Si el enqueue falla (Redis caído), el documento queda `EMITIDO` con
`pdf_status: PENDIENTE`; un reintento manual de generación (endpoint idempotente, ver Decisión 5)
lo recupera sin tocar el CAE.

`PdfGenerateProcessor`:

1. Carga `FiscalDocument` con `pessimistic_write` (mismo patrón que `FiscalInvoiceProcessor`).
2. No-op si `arcaStatus !== 'EMITIDO'` (nunca genera PDF de un documento sin CAE autoritativo).
3. No-op si `pdf_status === 'DISPONIBLE'` y el checksum de los datos fuente (hash de
   `documentType+documentNumber+cae+totalAmount+itemsSnapshot`) coincide con `pdf_checksum` y
   `pdf_template_version === PDF_TEMPLATE_VERSION` — evita regenerar sin motivo.
4. Marca `pdf_status: 'GENERANDO'`, construye payload QR (Decisión 1), genera PDF (Decisión 2),
   calcula SHA-256, y persiste atómicamente `pdf_data`, `pdf_checksum`, `pdf_size_bytes`,
   `pdf_template_version`, `pdf_generated_at`, `pdf_status: 'DISPONIBLE'`, `qr_code_data`.
5. En error de render, persiste `pdf_status: 'ERROR'`, `pdf_error_message` (mensaje sanitizado, sin
   datos fiscales en texto libre no controlado), sin tocar `arcaStatus`/`cae`.

_Concurrencia_: dos jobs para el mismo `fiscalDocumentId` convergen por `jobId` determinista
(BullMQ) + el lock de fila (paso 1) + el chequeo de checksum/versión (paso 3), replicando
exactamente la triple protección de idempotencia de `wsfe-emit` (jobId + lock + estado).

### 5. Reintento de generación documental: mismo endpoint de descarga, no un endpoint nuevo

Un `pdf_status: 'ERROR'` se recupera simplemente reencolando `pdf-generate` con el mismo `jobId`
determinista — no se agrega un endpoint de "reintentar PDF" en este change (eso sería reintento
administrativo, out-of-scope). El endpoint `GET /sales/:id/fiscal-document/pdf`, al ver
`pdf_status !== 'DISPONIBLE'`, responde 409 y (best-effort, no bloqueante) reencola el job si no
hay uno pendiente — así "Descargar PDF" sobre un documento en `ERROR` dispara su propia
recuperación sin superficie administrativa nueva.

### 6. Endpoints de descarga: streaming, sin binario en el JSON de venta

`GET /sales/:id/fiscal-document/pdf`: 404 si no hay `FiscalDocument`, 409 si `arcaStatus !==
EMITIDO` o `pdf_status !== DISPONIBLE` (cuerpo con el estado transitorio, no un error genérico),
200 con `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="{tipo}-{ptoVta}-{numero}.pdf"`
(nombre derivado y sanitizado de columnas propias, nunca de input del cliente), streaming del
`Buffer` de `pdf_data` (`res.end(buffer)` sobre un `StreamableFile`/`Buffer` de Nest, sin
serializar a JSON).

`GET /sales/:id/fiscal-document/qr`: mismos códigos de estado; 200 con `Content-Type: image/png`,
imagen generada on-the-fly desde `qrCodeData` (no se persiste el PNG, sólo la URL/payload — la
imagen es determinista y regenerable en cada request, sin costo relevante).

Ambos heredan los guards de clase de `SalesController` (`JwtAuthGuard`, `RolesGuard`,
ADMINISTRADOR/VENDEDOR) — mismo patrón que el endpoint de consulta de #224.

### 7. Contrato de detalle fiscal: disponibilidad, no binario

`FiscalDocumentResponseDto` (`sale-response.dto.ts:52-63`) gana: `qrAvailable: boolean`,
`pdfStatus: 'PENDIENTE'|'GENERANDO'|'DISPONIBLE'|'ERROR'`, `pdfGeneratedAt?: string`,
`pdfSizeBytes?: number`. Nunca `pdfData`/`qrCodeData` crudo — el frontend arma las URLs de
descarga/QR a partir del `id` de la venta (`/api/sales/:id/fiscal-document/pdf|qr`), no de un
valor devuelto en el JSON.

### 8. Frontend: acciones condicionadas por `pdfStatus`, reutilizando `FiscalStatusBadge`

`SaleDetailView.tsx` renderiza, dentro de la card "Documento fiscal" ya existente
(`SaleDetailView.tsx:154-170`), dos botones ("Descargar PDF", "Ver QR") sólo cuando
`arcaStatus === 'EMITIDO'`. Estado por `pdfStatus`:

- `PENDIENTE`/`GENERANDO`: botones deshabilitados con texto "Generando documento…" (no se afirma
  un error fiscal).
- `DISPONIBLE`: botones habilitados; "Descargar PDF" dispara `fetch` autenticado + `blob` +
  `URL.createObjectURL` (no navegación directa, para mandar el header `Authorization`); "Ver QR"
  abre un modal accesible (`role="dialog"`, foco atrapado, cerrable por teclado) con `<img>` del
  endpoint QR.
- `ERROR`: botón "Descargar PDF" con acción de reintento (dispara el mismo `fetch`, que
  reencola según Decisión 5) y mensaje de error recuperable, distinto del badge de `arcaStatus`.

Se agrega `salesKeys.fiscalArtifact(saleId)` en `sales-keys.ts` para invalidar/pollear el estado
del artefacto sin acoplarlo a `salesKeys.detail(id)`. `SaleReturnsHistoryTable.tsx` reutiliza el
mismo componente de acciones por fila de Nota de Crédito cuando su `fiscalDocument` está
`EMITIDO` + `DISPONIBLE`.

## Risks / Trade-offs

- [PDF/QR en columnas `bytea` de la misma tabla] → simple y suficiente para el volumen esperado
  (MVP, un comercio); si el tamaño de `fiscal_documents` se vuelve un problema de backup/vacuum,
  ahí se justifica extraer a tabla separada o a un object storage — no antes.
- [QR regenerado en cada `GET .../qr` en vez de persistido como imagen] → costo de CPU trivial
  (una llamada a `qrcode.toBuffer()` sobre ~200 bytes de payload) a cambio de no duplicar el
  artefacto binario y mantener una sola fuente de verdad (`qrCodeData`).
- [Bug preexistente descubierto durante el smoke test manual] `bullmq@5.75+` rechaza un `jobId`
  personalizado que contenga `:` (`Error: Custom Id cannot contain :`). El `jobId` de `wsfe-emit`
  (de #224) ya usaba `wsfe-emit:{fiscalDocumentId}` y nunca falló en tests porque
  `fiscal-invoice.queue.spec.ts` mockea `bullmq` y los E2E invocan el processor directamente sin
  pasar por el enqueue real — sólo se manifestó al correr worker + API reales contra Redis. Se
  corrigió el separador a `-` en ambos jobs (`wsfe-emit-{fiscalDocumentId}`,
  `pdf-generate-{fiscalDocumentId}`), sin cambiar la semántica de deduplicación.
- [`pdf-lib`/`qrcode` como dependencias nuevas] → necesarias: no existe ninguna capacidad de
  generación de PDF/QR en el repo hoy; ambas son librerías JS puras (sin binarios nativos), bien
  mantenidas y ampliamente usadas en Node.
- [Reintento de PDF implícito en el endpoint de descarga, no un endpoint dedicado] → evita
  superficie administrativa nueva (reservada a US27-B) a costa de que un 409 en descarga pueda,
  en el peor caso, reencolar un job ya en curso — mitigado por el `jobId` determinista de BullMQ
  (no crea un segundo job pendiente).

## Migration Plan

- Una migración TypeORM aditiva sobre `fiscal_documents`: agrega `pdf_data`, `pdf_checksum`,
  `pdf_size_bytes`, `pdf_template_version`, `pdf_generated_at`, `pdf_status` (default
  `'PENDIENTE'`), `pdf_error_message`. `down()` elimina las siete columnas.
- Sin cambios de datos existentes (columnas nuevas nullable o con default; ningún `FiscalDocument`
  `EMITIDO` en producción tiene aún un artefacto que migrar).
- Despliegue: la migración corre antes de habilitar el worker con `PdfGenerateProcessor`; no
  requiere downtime.
- Rollback: revertir la migración; los documentos ya `EMITIDO` sin PDF simplemente vuelven a
  mostrarse como "artefacto no disponible" en el frontend (comportamiento seguro, no oculta CAE).
