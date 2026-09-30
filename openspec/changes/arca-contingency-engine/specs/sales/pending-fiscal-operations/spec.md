# Spec Delta

## Purpose

Dar visibilidad y control administrativo sobre los documentos fiscales pendientes o rechazados,
para que un Administrador pueda listarlos, contarlos y forzar un reintento manual antes de que
exista la bandeja de alertas de US27-B.

## ADDED Requirements

### Requirement: Listado paginado de documentos fiscales pendientes

El sistema SHALL exponer `GET /sales/pending-fiscal`, restringido a rol ADMINISTRADOR, que devuelve
`FiscalDocument` en estado `PENDIENTE_FACTURACION` o `RECHAZADO` de forma paginada, filtrable por
estado, rango de fechas y tipo de comprobante, incluyendo cantidad de intentos, último error y
timestamps relevantes por documento.

#### Scenario: Listado sin filtros

- **WHEN** un Administrador solicita `GET /sales/pending-fiscal` sin filtros
- **THEN** el sistema responde 200 con una página de documentos pendientes/rechazados ordenados de
  forma estable, con intentos, último error y timestamps

#### Scenario: Filtrado por estado y tipo de comprobante

- **WHEN** un Administrador solicita el listado filtrando por `arcaStatus=RECHAZADO` y
  `documentType=FACTURA_A`
- **THEN** el sistema responde sólo con documentos que cumplen ambos filtros

#### Scenario: Acceso sin rol ADMINISTRADOR

- **WHEN** un usuario sin rol ADMINISTRADOR solicita `GET /sales/pending-fiscal`
- **THEN** el sistema responde 403 sin exponer datos del listado

### Requirement: Conteo de pendientes y rechazados

El sistema SHALL exponer `GET /sales/pending-fiscal/count`, restringido a rol ADMINISTRADOR, con la
cantidad de documentos en `PENDIENTE_FACTURACION` y en `RECHAZADO`, sin incluir datos sensibles ni
XML.

#### Scenario: Conteo para badge de navegación

- **WHEN** un Administrador solicita el conteo
- **THEN** el sistema responde 200 con la cantidad de pendientes y de rechazados actuales

### Requirement: Reintento manual idempotente

El sistema SHALL exponer `POST /sales/pending-fiscal/:fiscalDocumentId/retry`, restringido a rol
ADMINISTRADOR, que encola un reintento para el documento indicado usando el mismo `jobId`
determinista que el reintento automático, SHALL responder con el job existente sin duplicarlo si ya
hay uno encolado o en curso, SHALL responder 404 si el documento no existe, y SHALL responder
409/422 si el documento ya está `EMITIDO` o no es reintentable.

#### Scenario: Reintento manual de un documento pendiente

- **WHEN** un Administrador dispara el reintento manual de un `FiscalDocument`
  `PENDIENTE_FACTURACION` sin job activo
- **THEN** el sistema encola el job y responde con su identificador

#### Scenario: Reintento manual repetido mientras el job sigue activo

- **WHEN** un Administrador dispara el reintento manual dos veces seguidas para el mismo documento
  antes de que el primer job termine
- **THEN** el sistema responde con el mismo job ya encolado en ambas solicitudes, sin crear un
  segundo job

#### Scenario: Reintento manual de un documento ya emitido

- **WHEN** un Administrador dispara el reintento manual de un `FiscalDocument` que ya está
  `EMITIDO`
- **THEN** el sistema responde 409/422 sin encolar ningún job ni tocar el CAE persistido

#### Scenario: Reintento manual de un documento inexistente

- **WHEN** un Administrador dispara el reintento manual con un `fiscalDocumentId` que no existe
- **THEN** el sistema responde 404

### Requirement: Auditoría del reintento manual

El sistema SHALL registrar en el log de auditoría existente cada reintento manual disparado por un
Administrador, incluyendo el identificador del documento, del job resultante y del actor, sin
incluir el payload SOAP ni secretos.

#### Scenario: Auditoría de un reintento manual exitoso

- **WHEN** un Administrador dispara un reintento manual válido
- **THEN** el sistema registra una entrada de auditoría con el `fiscalDocumentId`, el `jobId` y el
  identificador del Administrador

### Requirement: Métricas mínimas de la cola de emisión fiscal

El sistema SHALL exponer métricas mínimas de la cola `wsfe-emit` (cantidad de jobs esperando,
activos, demorados y fallidos) junto con la antigüedad del documento pendiente más antiguo, para
detectar una cola detenida o pendientes envejecidos.

#### Scenario: Métricas con cola saludable

- **WHEN** un Administrador consulta las métricas y no hay pendientes envejecidos
- **THEN** el sistema responde con los conteos de la cola y una antigüedad mínima o nula del
  pendiente más viejo

#### Scenario: Métricas detectan pendientes envejecidos

- **WHEN** existe un documento `PENDIENTE_FACTURACION` sin resolver por más tiempo que el resto
- **THEN** las métricas reflejan su antigüedad de forma que un operador pueda identificar la cola
  detenida
