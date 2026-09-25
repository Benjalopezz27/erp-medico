# Tasks

## 1. Migración de base de datos

- [x] 1.1 Crear migración TypeORM que agregue `CREATE UNIQUE INDEX ... ON fiscal_documents (document_type, point_of_sale, document_number) WHERE document_number IS NOT NULL`, con `down()` que la elimina; verificar corriendo `npm run migration:run` y `migration:revert` localmente sin error.

## 2. Transporte WSFE (SOAP crudo)

- [x] 2.1 Crear `WsfeSoapClientService` con métodos para construir y enviar `FECompUltimoAutorizado`, `FECAESolicitar` y `FECompConsultar` (template XML + `https.request`, mismo timeout de 10 s que WSAA), y parsear las respuestas (CAE, vencimiento, número autorizado, o fault); verificar con unit tests que mockean `https` cubriendo respuesta exitosa, fault SOAP y respuesta incompleta.
- [x] 2.2 Sanitizar cualquier log/error de `WsfeSoapClientService` para no incluir Token/Sign, certificado ni XML completo; verificar con un test que fuerza un error y aserta que el mensaje no contiene esos valores.
- [x] 2.3 Implementar `ArcaHomologationService.requestCAE()` usando `WsfeSoapClientService` + el número reservado (ver tarea 4.2); verificar con unit test que, dado un `FiscalDocumentData` válido, invoca `FECAESolicitar` con los importes correctos y devuelve CAE/vencimiento.
- [x] 2.4 Implementar `ArcaHomologationService.queryDocument()` usando `FECompConsultar`; verificar con unit test que devuelve `null` cuando ARCA no tiene el comprobante y el objeto mapeado cuando sí.
- [x] 2.5 Verificar que `ARCA_ENV=homologation` con configuración incompleta (falta `ARCA_CUIT`/`ARCA_PUNTO_VENTA`/URL WSFE) sigue rechazando la emisión sin contactar ARCA (test existente de `validateHomologationConfig` extendido si aplica).

## 3. Caché compartida de ticket WSAA en Redis

- [x] 3.1 Crear `ArcaTicketCacheService` (get/set sobre `REDIS_CONNECTION`) con clave `arca:wsaa:ticket:{env}:{cuit}`, TTL = `min(12h, segundosHastaExpiration) - margen`; verificar con unit tests: hit, miss, expiración, aislamiento por ambiente/CUIT.
- [x] 3.2 Integrar `ArcaTicketCacheService` en `ArcaHomologationService.login()` reemplazando el campo `cachedTicket` en memoria; verificar con unit test que un segundo `login()` con ticket cacheado vigente no vuelve a llamar `callWsaaLoginCms`.
- [x] 3.3 Degradar a login directo cuando Redis no responde (get o set fallan); verificar con unit test que simula un error de Redis y confirma que `login()` igual completa vía WSAA real (mockeado) sin lanzar excepción por el fallo de caché.

## 4. Resolución de tipo de comprobante y numeración

- [x] 4.1 Crear `InvoiceTypeResolverService` que devuelve `FACTURA_A`/`FACTURA_B` a partir de `Customer.taxCondition`/`documentType` y la condición fiscal del emisor (config); verificar con unit tests para RESPONSABLE_INSCRIPTO+CUIT, MONOTRIBUTO+CUIT, CONSUMIDOR_FINAL, EXENTO y CUIT inválido.
- [x] 4.2 Implementar el helper de numeración serializada (`pg_advisory_lock`/`pg_advisory_unlock` por `hashtext(pointOfSale:documentType)`) que consulta `FECompUltimoAutorizado`, calcula `nextNumber`, y persiste `documentNumber` en el `FiscalDocument` antes de invocar `FECAESolicitar`; verificar con un test de integración (Postgres real o testcontainer) que dos llamadas concurrentes para el mismo punto de venta/tipo obtienen números consecutivos sin colisión.
- [x] 4.3 Verificar que el índice único de la tarea 1.1 rechaza un `UPDATE` con `(documentType, pointOfSale, documentNumber)` duplicado, y que el código que persiste el resultado maneja ese conflicto recargando el documento en vez de lanzar un 500 sin contexto.

## 5. Cola `wsfe-emit` y processor del worker

- [x] 5.1 Agregar `FISCAL_INVOICE_QUEUE_NAME`/`FISCAL_INVOICE_JOB_NAME` a `queue.constants.ts` y crear `FiscalInvoiceQueueService` (producer) siguiendo el patrón de `OpsProbeQueueService`, con `jobId = "wsfe-emit:" + fiscalDocumentId`; verificar con unit test (mock de `bullmq`) que `enqueueCaeRequest` usa ese `jobId` y que un segundo enqueue con el mismo `fiscalDocumentId` no crea un job duplicado.
- [x] 5.2 Crear `FiscalInvoiceProcessor` (consumer) que: carga el `FiscalDocument` con `SELECT ... FOR UPDATE`, no hace nada si ya está `EMITIDO`/`RECHAZADO`, resuelve tipo de comprobante (4.1), construye importes con `buildFiscalAmounts`/`validateFiscalAmounts`, ejecuta la numeración serializada (4.2) y llama `ARCA_SERVICE.requestCAE`; verificar con unit tests: happy path con mock de ARCA, documento ya emitido (no-op), y totales inconsistentes (rechaza sin llamar a ARCA).
- [x] 5.3 En éxito, persistir atómicamente tipo, punto de venta, número, CAE, vencimiento, `issuedAt` y `EMITIDO` sin tocar `Sale.status`; en fallo/rechazo de ARCA, persistir `RECHAZADO` con `arcaErrorMessage` sanitizado; verificar con unit tests ambos caminos y que `Sale.status` no se modifica en ninguno.
- [x] 5.4 Registrar `FiscalInvoiceProcessor` en `QueueConsumerModule`/`WorkerModule`; verificar que el worker arranca sin errores (`worker.module.ts` compila e inicializa el processor en un test de integración liviano o smoke).

## 6. Encolado post-commit desde ventas y devoluciones

- [x] 6.1 Importar `QueueModule` (producer) y lo necesario de `ArcaModule` en `SalesModule`; verificar que el módulo de Nest compila (`nest build` o test de bootstrap).
- [x] 6.2 En `SalesService.create()`, después de que `await this.dataSource.transaction(...)` resuelve, encolar `enqueueCaeRequest({ fiscalDocumentId })` sólo si se creó `FiscalDocument`, con `try/catch` que loguea sin relanzar; verificar con unit test que una venta facturable llama al enqueue tras el commit, y que si el enqueue lanza, `create()` igual devuelve la venta confirmada.
- [x] 6.3 Aplicar el mismo encolado en el método de creación de Nota de Crédito de `SaleReturnsService`; verificar con unit test equivalente.
- [x] 6.4 Verificar con test que una venta de contado sin `requiresFiscalInvoice` y una venta a crédito sin factura no encolan ningún job (regresión del flujo existente).

## 7. Endpoint de consulta

- [x] 7.1 Agregar `FiscalDocumentResponseDto` en `packages/shared-types` con los campos de estado y datos fiscales autorizados; verificar que el paquete compila (`tsc --noEmit` o build del workspace).
- [x] 7.2 Agregar `GET /sales/:id/fiscal-document` en `SalesController` (mismos guards/roles de clase: ADMINISTRADOR, VENDEDOR) con su mapper; verificar con unit test de controller/service para 200 (`EMITIDO`), 200 (`PENDIENTE_FACTURACION`), 404 (sin documento) y documentar en Swagger.
- [x] 7.3 Verificar 401 sin token y 403 con rol no autorizado mediante test e2e ligero o de guard.

## 8. Pruebas end-to-end y regresión

- [ ] 8.1 E2E: venta de contado facturable → `POST /sales` → job procesado (ARCA en modo mock/`ARCA_ENV=development` corriendo el processor in-process) → `GET /sales/:id/fiscal-document` devuelve `EMITIDO` con CAE.
- [ ] 8.2 E2E: devolución sobre venta facturada → Nota de Crédito A/B vinculada a la factura original, mismo punto de venta.
- [ ] 8.3 E2E/regresión: venta de contado sin factura y venta a crédito sin factura no generan `FiscalDocument` ni encolan job (comportamiento existente intacto).
- [ ] 8.4 Test de fallo de enqueue post-commit (Redis caído simulado): la venta queda `CONFIRMADA`, el `FiscalDocument` queda `PENDIENTE_FACTURACION`, sin rollback de stock ni cuenta corriente.
- [ ] 8.5 Correr formato, lint, unitarios, e2e y build completos del monorepo (`npm run lint`, `npm run test`, `npm run test:e2e`, `npm run build`) y dejar constancia de que pasan antes de abrir el PR.
