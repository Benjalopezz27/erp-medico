# Design

## Context

`FiscalDocument` ya se crea en `PENDIENTE_FACTURACION` dentro de la transacción de venta (#209) y
de devolución (#211): columnas `documentType`, `pointOfSale`, `documentNumber`, `cae`,
`caeExpirationDate`, `arcaStatus`, `arcaErrorMessage`, `issuedAt` ya existen
(`fiscal-document.entity.ts`). `ArcaHomologationService.login()` ya resuelve WSAA real (cert +
firma CMS + `https.request` + parseo por regex, sin librería SOAP); `requestCAE`/`queryDocument`
están stubbeados. Existe infraestructura BullMQ (`OpsProbeQueueService`/`OpsProbeProcessor`,
`redisConnectionProvider`) pero sin cola fiscal, y `QueueModule` no está importado en `AppModule`.
Ver `proposal.md - Why` para la motivación completa.

## Goals / Non-Goals

**Goals:**
- Completar el transporte WSFE reutilizando el patrón ya validado de WSAA (XML + `https.request`,
  sin nueva dependencia SOAP).
- Serializar la numeración de comprobantes de forma que sobreviva a dos workers concurrentes.
- Encolar y procesar la emisión sin acoplar la confirmación de venta/devolución a la
  disponibilidad de ARCA o Redis.
- Dejar persistido, antes de cualquier llamada de resultado incierto, el número de comprobante que
  se está por solicitar (para que US27-A pueda reconciliar con `FECompConsultar`).

**Non-Goals:**
- Reintentos automáticos, backoff, reconciliación periódica o recuperación de jobs huérfanos
  (US27-A).
- PDF/QR/descarga (US26-B) y bandeja de alertas (US27-B).
- Cliente WSFE de producción real (bloqueado por el gate de #71); el branch `ARCA_ENV=production`
  del provider sigue fallando de forma cerrada.
- Tabla de configuración multi-emisor/multi-punto-de-venta; se mantiene configuración por entorno
  (`ARCA_CUIT`, `ARCA_PUNTO_VENTA`) como hoy.

## Decisions

### 1. Transporte WSFE: XML + `https.request`, sin librería SOAP
Se agrega `WsfeSoapClientService` (`apps/backend/src/modules/arca/services/wsfe-soap-client.service.ts`)
que construye los envelopes de `FECompUltimoAutorizado`, `FECAESolicitar` y `FECompConsultar` como
templates de string, firma con el Token/Sign vigente, hace el POST con el módulo `https` nativo
(mismo timeout de 10 s que WSAA) y parsea la respuesta con extracción de campos puntual (no XML
parser genérico). `ArcaHomologationService` sigue siendo el único punto que implementa
`IArcaService`; delega el transporte a este cliente para poder testear mapeo/orquestación sin red.

*Alternativa descartada*: agregar `soap`/`strong-soap`. Se descarta por ser una dependencia nueva
para un caso ya resuelto sin ella en WSAA, y porque los WSDL de AFIP suelen requerir workarounds
manuales de todas formas.

### 2. Resolución de tipo de comprobante: servicio dedicado, no lógica embebida
`InvoiceTypeResolverService` (`apps/backend/src/modules/arca/services/invoice-type-resolver.service.ts`)
recibe `Customer.taxCondition` + tipo de documento y la condición fiscal del emisor (config), y
devuelve `FACTURA_A` o `FACTURA_B`. Se invoca desde el processor del worker antes de construir el
request WSFE (no en `SalesService.create()`, para no acoplar la resolución fiscal a la transacción
de venta y poder testearla de forma aislada).

Regla: emisor RESPONSABLE_INSCRIPTO + cliente RESPONSABLE_INSCRIPTO/MONOTRIBUTO con CUIT →
Factura A; cualquier otro caso (CONSUMIDOR_FINAL, EXENTO, sin CUIT válido) → Factura B.

### 3. Numeración serializada: advisory lock de Postgres, no lock de Redis
El processor adquiere un `pg_advisory_lock(hashtext(pointOfSale || ':' || documentType))` sobre una
conexión dedicada (TypeORM `QueryRunner`) antes de: (a) consultar `FECompUltimoAutorizado`, (b)
calcular `nextNumber = last + 1`, (c) persistir `documentNumber = nextNumber` en el
`FiscalDocument` (aún en `PENDIENTE_FACTURACION`, este es el número "a consultar" que deja US27-A),
y (d) invocar `FECAESolicitar`. El lock se libera (`pg_advisory_unlock`) en un `finally`.

*Alternativa descartada*: lock distribuido en Redis (`SET NX PX`). Se descarta porque la
numeración es una invariante de negocio crítica y ya existe Postgres como fuente de verdad
transaccional; sumar Redis como segundo mecanismo de exclusión mutua duplica el modo de falla sin
necesidad. Redis ya se usa para el ticket WSAA (ítem 5), no para esto.

*Riesgo*: el lock se mantiene durante el round-trip HTTP a ARCA (hasta ~10 s por el timeout
existente), reteniendo una conexión del pool. Mitigado por: timeout corto ya vigente, y porque el
volumen de emisiones concurrentes por punto de venta es bajo (un comercio, pocos puntos de venta).

### 4. Constraint de unicidad en base de datos como backstop
Nueva migración agrega un índice único parcial:
`CREATE UNIQUE INDEX ON fiscal_documents (document_type, point_of_sale, document_number) WHERE document_number IS NOT NULL`.
El advisory lock evita la colisión en el camino feliz; el índice único es la garantía de última
instancia si dos procesos igual llegaran a calcular el mismo número (bug, reinicio de lock, etc.).
Un conflicto de este índice en el `UPDATE` de persistencia se interpreta como emisión duplicada:
el processor recarga el documento y, si ya quedó `EMITIDO`, no reintenta.

### 5. Ticket WSAA compartido: Redis, TTL efectivo = min(12 h, expiración real)
`ArcaTicketCacheService` (`apps/backend/src/modules/arca/services/arca-ticket-cache.service.ts`)
reemplaza el campo `cachedTicket` en memoria de `ArcaHomologationService`. Clave:
`arca:wsaa:ticket:{ARCA_ENV}:{ARCA_CUIT}`, valor JSON `{ token, sign, expirationTime }`, TTL de
Redis = `min(12h, segundosHastaExpirationTime) - margen(10min)`. Si Redis no responde (get o set),
se degrada a login WSAA directo por ese intento (no se cachea, no se rompe el flujo) — mismo
patrón de tolerancia a fallos que `redisConnectionProvider` ya aplica en la cola.

### 6. Cola `wsfe-emit`: mismo patrón que `ops-probe`, `jobId` determinista
`FiscalInvoiceQueueService` (producer, en `queue.module.ts`) y `FiscalInvoiceProcessor` (consumer,
en `queue-consumer.module.ts`/`WorkerModule`) siguen el patrón exacto de `OpsProbeQueueService`/
`OpsProbeProcessor`: `Queue`/`Worker` de BullMQ, `defaultJobOptions` con reintentos limitados
(idempotencia es responsabilidad del processor, no de BullMQ). `jobId = "wsfe-emit:" + fiscalDocumentId`
asegura que un enqueue duplicado para el mismo documento no genere dos jobs pendientes.

Al inicio del processor, antes de tocar ARCA: `SELECT ... FOR UPDATE` sobre la fila del
`FiscalDocument`; si `arcaStatus` ya es `EMITIDO` o `RECHAZADO`, el processor termina sin acción
(idempotencia ante reproceso o dos workers).

### 7. Encolado post-commit, tolerante a fallos de Redis
`SalesService.create()` y el método de creación de nota de crédito en `SaleReturnsService` llaman
a `fiscalInvoiceQueueService.enqueueCaeRequest({ fiscalDocumentId })` inmediatamente después de que
`await this.dataSource.transaction(...)` resuelve (nunca dentro del callback). La llamada está en
un `try/catch` que sólo loguea la falla — el documento queda `PENDIENTE_FACTURACION` y la venta ya
está confirmada, cumpliendo el requisito de no revertir por una falla de encolado.

### 8. `QueueModule` pasa a importarse en `SalesModule`
Hoy sólo `WorkerModule` importa `QueueConsumerModule`. Se agrega `QueueModule` (producer) a las
importaciones de `SalesModule` para que `SalesService`/`SaleReturnsService` puedan inyectar
`FiscalInvoiceQueueService`. `ArcaModule` se importa en `SalesModule` (o se exporta lo necesario)
para que el processor pueda resolver `ARCA_SERVICE`.

### 9. Endpoint de consulta reutiliza `SalesController`
`GET /sales/:id/fiscal-document` se agrega como método adicional en el `SalesController`
existente (mismos guards de clase: `JwtAuthGuard`, `RolesGuard`, roles ADMINISTRADOR/VENDEDOR), con
un `FiscalDocumentResponseDto` nuevo en `packages/shared-types` y su mapper.

## Risks / Trade-offs

- [Advisory lock retiene una conexión durante el round-trip HTTP] → timeout de 10 s ya vigente en
  el patrón WSAA; bajo volumen esperado por punto de venta.
- [Ticket cache en Redis compartido entre API y worker] → si Redis cae, cada proceso vuelve a
  loguearse en WSAA por request; se acepta como degradación, no como falla dura (igual que hoy sin
  caché compartido).
- [Advisory lock + constraint único duplican protección de numeración] → intencional: el lock
  evita la colisión en el camino feliz, el índice único es el backstop de última instancia:
  aceptamos la redundancia por ser una invariante fiscal crítica.
- [Nueva migración sobre `fiscal_documents`] → aditiva (índice único parcial), no cambia datos
  existentes; reversible con `DROP INDEX`.

## Migration Plan

- Una migración TypeORM aditiva: `CREATE UNIQUE INDEX ... WHERE document_number IS NOT NULL` sobre
  `fiscal_documents (document_type, point_of_sale, document_number)`. `down()` la elimina.
- Sin cambios de datos existentes (no hay filas con `documentNumber` no nulo hoy en producción,
  dado que la emisión real nunca se completó).
- Despliegue: la migración corre antes de habilitar `ARCA_ENV=homologation` en el worker; no
  requiere downtime.
- Rollback: revertir la migración y volver el `ARCA_ENV` del worker a `disabled`/`development`
  sin afectar ventas ya confirmadas (el estado `PENDIENTE_FACTURACION` es seguro de mantener).
