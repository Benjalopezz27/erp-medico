# Tasks

## 1. Backend — quitar auto-enqueue

- [x] 1.1 Borrar el bloque `try { enqueueCaeRequest(...) } catch` en `SalesService.create()` (`apps/backend/src/modules/sales/sales.service.ts:253-267`); el `FiscalDocument` queda creado en `PENDIENTE_FACTURACION` sin encolar nada. Verificar corriendo `sales.service.spec.ts` (ajustar el test que hoy espera el enqueue automático) y confirmando que ya no se llama a `fiscalInvoiceQueueService.enqueueCaeRequest` desde `create()`.
- [x] 1.2 Confirmar en `sales.e2e-spec.ts`/`fiscal-documents` e2e que una venta con `requiresFiscalInvoice: true` recién creada aparece en `GET sales/pending-fiscal` sin necesidad de que falle un enqueue.

## 2. Backend — preview de comprobante

- [x] 2.1 Agregar `SalesService.previewFiscalDocument(saleId)`: carga la venta y su `FiscalDocument`, resuelve el tipo con `InvoiceTypeResolverService.resolve()` a partir de la condición fiscal del cliente, y arma la respuesta con ítems/totales ya persistidos en `Sale`. Si el documento ya tiene CAE, devuelve los datos reales (tipo, número, CAE) en vez del cálculo. Si la venta no requiere factura, lanza error. Verificar con test unitario cubriendo los 3 casos (pendiente, ya emitido, sin factura requerida).
- [x] 2.2 Agregar DTO de respuesta `FiscalDocumentPreviewResponseDto` (tipo, receptor, ítems, totales, `isEmitted`) junto a los DTOs existentes en `apps/backend/src/modules/sales/dto/`.
- [x] 2.3 Agregar `GET sales/:id/fiscal-document/preview` en `SalesController`, mismo `@Roles` que la clase (sin restricción extra). Verificar con e2e: 200 para venta pendiente, 200 con datos reales para venta emitida, error para venta sin factura.

## 3. Backend — emisión manual

- [x] 3.1 Agregar `SalesController.emitFiscalDocument` → `POST sales/:id/fiscal-document/emit`, que resuelve el `fiscalDocumentId` de la venta y delega en `PendingFiscalService.retry(fiscalDocumentId, user.id)` (inyectar `PendingFiscalService` en `SalesModule`/`SalesController` si no está ya). Reusa 409 (ya emitido) y 422 (no reintentable) tal cual expone hoy `PendingFiscalController`. Verificar con e2e: encola sobre documento `PENDIENTE_FACTURACION`, 409 sobre `EMITIDO`, no duplica job en un segundo llamado inmediato (idempotencia por `jobId`).
- [x] 3.2 Confirmar que el endpoint de emisión manual no requiere rol `ADMINISTRADOR` (a diferencia de `sales/pending-fiscal/*/retry`) — mismo acceso que crear ventas. Verificar con test de guard/e2e que un usuario `VENDEDOR` puede llamarlo.

## 4. Frontend — preview y emisión manual

- [x] 4.1 Agregar al `sales.api.ts` las funciones `getFiscalDocumentPreview(saleId)` y `emitFiscalDocument(saleId)` contra los endpoints nuevos.
- [x] 4.2 Extender `FiscalDocumentActions.tsx` (o agregar componente hermano) con: vista de preview (tipo, receptor, ítems, totales) y botón "Emitir factura" que llama a `emitFiscalDocument` y luego refresca el estado (reusar el polling/lectura de estado que ya usa `FiscalStatusBadge`/`use-fiscal-document-artifact.ts` para reflejar cuando pase a `EMITIDO`). Verificar manualmente en la app (venta con factura requerida → ver preview → emitir → ver estado pasar a emitido) y actualizar/agregar test en `FiscalDocumentActions.spec.tsx` cubriendo el nuevo botón y la vista de preview.

## 5. Verificación end-to-end

- [x] 5.1 Correr la suite completa de `sales` y `fiscal-documents` (`apps/backend/test/*.e2e-spec.ts` relevantes) y confirmar que pasan con el auto-enqueue removido.
- [x] 5.2 Smoke test manual del flujo completo: crear venta con factura requerida → ver que NO se emite sola → abrir preview → confirmar emisión → ver PDF disponible al terminar el job, sin tocar `pending-fiscal` admin.
