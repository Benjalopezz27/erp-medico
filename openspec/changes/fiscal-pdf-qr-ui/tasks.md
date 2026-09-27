# Tasks

## 1. Migración de base de datos y dependencias

- [x] 1.1 Crear migración TypeORM `1700000000027-AddPdfArtifactToFiscalDocuments` que agregue a
      `fiscal_documents`: `pdf_data` (bytea), `pdf_checksum` (varchar 64), `pdf_size_bytes` (int),
      `pdf_template_version` (varchar 10), `pdf_generated_at` (timestamptz), `pdf_status` (varchar
      20, default `'PENDIENTE'`), `pdf_error_message` (text); `down()` elimina las siete columnas;
      verificar corriendo `migration:run` y `migration:revert` localmente sin error.
- [x] 1.2 Agregar `pdf-lib` y `qrcode` (+ `@types/qrcode`) como dependencias del backend; verificar
      que `npm install` y el build del workspace no rompen.

## 2. Payload QR fiscal

- [x] 2.1 Crear `FiscalQrPayloadService` que construya el objeto AFIP (`ver`, `fecha`, `cuit`,
      `ptoVta`, `tipoCmp`, `nroCmp`, `importe`, `moneda`, `ctz`, `tipoDocRec`, `nroDocRec`,
      `tipoCodAut`, `codAut`) desde un `FiscalDocument` + su `Sale`/`Customer`, con orden de claves
      fijo y la URL final `https://www.afip.gob.ar/fe/qr/?p={base64}`; verificar con unit tests
      para Factura A, Factura B, Nota de Crédito A/B, Consumidor Final (sin CUIT) y comprobante con
      CUIT, aserta que el mismo input produce siempre el mismo payload.
- [x] 2.2 Verificar con unit test que el payload decodifica (base64 → JSON) a un objeto con los 13
      campos esperados y tipos correctos (números vs strings).

## 3. Template PDF

- [x] 3.1 Crear `FiscalPdfTemplateService` (`pdf-lib`) con `PDF_TEMPLATE_VERSION = 'v1'`, que
      renderice emisor, receptor (snapshot de venta, no `Customer` actual), tipo/número, fecha,
      ítems/cantidades/netos/IVA/total, CAE, vencimiento e imagen QR (PNG generado con `qrcode`
      desde el payload de la tarea 2.1) embebida; verificar con unit test que el buffer resultante
      empieza con la firma `%PDF` y contiene el texto esperado (extracción básica de texto).
- [x] 3.2 Verificar con unit tests: comprobante con caracteres especiales (acentos/ñ) en
      nombre/dirección, comprobante con múltiples páginas (muchos ítems), y comprobante sin campos
      opcionales (sin dirección de receptor, etc.) no rompen el render.
- [x] 3.3 Verificar con unit test que el checksum SHA-256 del PDF generado dos veces para el mismo
      `FiscalDocument` sin cambios es estable (mismo buffer, mismo hash).

## 4. Cola `pdf-generate` y processor del worker

- [x] 4.1 Agregar `PDF_GENERATE_QUEUE_NAME`/`PDF_GENERATE_JOB_NAME` a `queue.constants.ts` y crear
      `PdfGenerateQueueService` (producer) siguiendo el patrón de `FiscalInvoiceQueueService`, con
      `jobId = "pdf-generate-" + fiscalDocumentId`; verificar con unit test que un segundo enqueue
      para el mismo `fiscalDocumentId` no crea un job duplicado.
- [x] 4.2 Crear `PdfGenerateProcessor` (consumer, en `QueueConsumerModule`/`WorkerModule`) que:
      carga el `FiscalDocument` con lock de fila, no hace nada si `arcaStatus !== 'EMITIDO'`, no
      regenera si `pdf_status === 'DISPONIBLE'` y checksum/versión de template coinciden, marca
      `GENERANDO`, genera QR (2) + PDF (3), persiste atómicamente `pdf_data`, `pdf_checksum`,
      `pdf_size_bytes`, `pdf_template_version`, `pdf_generated_at`, `pdf_status: 'DISPONIBLE'` y
      `qr_code_data`; verificar con unit tests: happy path, documento sin CAE (no-op), documento ya
      `DISPONIBLE` con mismo checksum/versión (no regenera), y checksum/versión distintos
      (regenera).
- [x] 4.3 En error de render, persistir `pdf_status: 'ERROR'` y `pdf_error_message` sanitizado, sin
      tocar `arcaStatus`/`cae`/`caeExpirationDate`; verificar con unit test que fuerza un error de
      `FiscalPdfTemplateService` y aserta que el `FiscalDocument` conserva `EMITIDO` y su CAE.
- [x] 4.4 Verificar con test de integración que dos ejecuciones concurrentes del job para el mismo
      `fiscalDocumentId` (mismo `jobId`, o dos workers procesando el mismo registro) convergen a un
      único artefacto final sin condición de carrera.

## 5. Encolado post-CAE

- [x] 5.1 En `FiscalInvoiceProcessor`, después del `UPDATE` exitoso que persiste `EMITIDO`
      (`processWithLock`, branch de éxito), encolar `pdfGenerateQueueService.enqueue({
fiscalDocumentId })` en un `try/catch` que sólo loguea; verificar con unit test que una
      emisión exitosa encola el job, y que si el enqueue lanza, la emisión fiscal igual queda
      persistida como `EMITIDO`.
- [x] 5.2 Verificar con unit test que una emisión rechazada (`RECHAZADO`) o un no-op (documento ya
      procesado) nunca encola `pdf-generate`.

## 6. Contrato de detalle fiscal

- [x] 6.1 Extender `FiscalDocumentResponseDto` (`packages/shared-types` + backend) con
      `qrAvailable: boolean`, `pdfStatus: 'PENDIENTE'|'GENERANDO'|'DISPONIBLE'|'ERROR'`,
      `pdfGeneratedAt?: string`, `pdfSizeBytes?: number`, sin exponer `pdfData`/`qrCodeData`
      crudos; verificar que el paquete y el backend compilan (`tsc --noEmit`).
- [x] 6.2 Actualizar el mapper de `SalesService`/`SaleReturnsService` que arma
      `FiscalDocumentResponseDto` para incluir estos campos; verificar con unit test para los
      cuatro estados de `pdfStatus`.

## 7. Endpoints de descarga

- [x] 7.1 Agregar `GET /sales/:id/fiscal-document/pdf` en `SalesController` (mismos guards/roles de
      clase): streaming del buffer con `Content-Type: application/pdf` y `Content-Disposition`
      derivado de tipo+número sanitizados; 409 si `arcaStatus !== EMITIDO` o `pdf_status !==
DISPONIBLE`, 404 sin `FiscalDocument`; verificar con unit tests de controller/service para
      200, 409 y 404, y documentar en Swagger.
- [x] 7.2 Agregar `GET /sales/:id/fiscal-document/qr` en `SalesController`: 200 con imagen PNG
      generada desde `qrCodeData` cuando `arcaStatus === EMITIDO` y hay payload persistido; mismos
      404/409 que el PDF; verificar con unit test que decodifica la imagen resultante y coincide
      con el payload esperado.
- [x] 7.3 Verificar 401 sin token y 403 con rol no autorizado en ambos endpoints mediante test de
      guard/e2e ligero.
- [x] 7.4 En el 409 de descarga de PDF, si no hay un job `pdf-generate` pendiente para ese
      `fiscalDocumentId`, reencolar (best-effort, no bloqueante) siguiendo la Decisión 5 de
      `design.md`; verificar con unit test que un segundo intento de descarga sobre un documento en
      `ERROR` reencola sin duplicar el `jobId`.

## 8. Frontend — detalle de venta

- [x] 8.1 ~~Agregar `salesKeys.fiscalArtifact(saleId)`~~ — simplificado: el estado del artefacto
      (`pdfStatus`/`qrAvailable`) ya viaja embebido en `sale.fiscalDocument` (contrato de la tarea
      6.1), que `useSaleDetailQuery` ya trae; no se agrega una query key ni un fetch separado sólo
      para pollear disponibilidad. La descarga y el QR se piden on-demand (mutation) recién al
      hacer clic/abrir el modal, vía `use-fiscal-document-artifact.ts`.
- [x] 8.2 Extender la card "Documento fiscal" de `SaleDetailView.tsx` con botones "Descargar PDF"
      (fetch autenticado + blob + `URL.createObjectURL`, nunca navegación directa) y "Ver QR"
      (modal accesible, foco atrapado, cerrable por teclado), habilitados sólo cuando
      `arcaStatus === EMITIDO` y condicionados por `pdfStatus`; verificar con test de componente
      los cuatro estados (pendiente/generando/disponible/error) y que las acciones no aparecen si
      `arcaStatus !== EMITIDO`.
- [x] 8.3 Verificar con test de accesibilidad básico (teclado, roles ARIA) que el modal de QR y los
      botones de descarga son operables por teclado y anunciados por lector de pantalla.

## 9. Frontend — devoluciones

- [x] 9.1 Extender `SaleReturnsHistoryTable.tsx` para mostrar la acción de descarga/QR de la Nota
      de Crédito cuando su `fiscalDocument` está `EMITIDO` con artefacto `DISPONIBLE`, reutilizando
      el componente de acciones de la tarea 8.2; verificar con test de componente que la acción no
      aparece si el artefacto no está disponible.

## 10. Pruebas end-to-end, regresión y cierre

- [x] 10.1 E2E: venta facturable → `EMITIDO` (worker con ARCA mock) → job `pdf-generate` procesado
      → `GET /sales/:id/fiscal-document/pdf` descarga un PDF válido → `GET
/sales/:id/fiscal-document/qr` decodifica al payload esperado.
- [x] 10.2 E2E: devolución con Nota de Crédito emitida → PDF y QR propios, vinculados visualmente a
      la devolución, sin modificar la factura ni la devolución originales.
- [x] 10.3 E2E/regresión: repetir o ejecutar concurrentemente `pdf-generate` sobre el mismo
      documento no duplica artefactos ni produce versiones contradictorias (cubre criterio de
      aceptación de la issue).
- [x] 10.4 Regresión de `/sales/:id`, historial de devoluciones y `FiscalStatusBadge`: ninguna
      pantalla existente cambia de comportamiento para ventas sin factura o con factura pendiente.
- [x] 10.5 Correr formato, lint, unitarios, frontend, e2e y build completos del monorepo (`npm run
lint`, `npm run test`, `npm run test:e2e`, `npm run build`) y dejar constancia de que pasan
      antes de abrir el PR.
