# Spec Delta

## Purpose

Reemplaza el encolado automático de emisión fiscal al crear una venta por un disparo explícito del usuario, manteniendo intacto el pipeline de emisión, contingencia y PDF ya existente.

## ADDED Requirements

### Requirement: La creación de venta no dispara emisión automática

Al confirmar una venta con `requiresFiscalInvoice = true`, el sistema SHALL crear el `FiscalDocument` en estado `PENDIENTE_FACTURACION` sin encolar automáticamente el job de solicitud de CAE.

#### Scenario: Venta confirmada con factura requerida

- **WHEN** el usuario confirma una venta con `requiresFiscalInvoice = true`
- **THEN** el sistema crea el `FiscalDocument` en `PENDIENTE_FACTURACION` y no encola el job de emisión

### Requirement: Emisión manual de comprobante

El sistema SHALL exponer una acción explícita de emisión que, para un `FiscalDocument` en `PENDIENTE_FACTURACION`, encola el job de solicitud de CAE existente, reutilizando sin cambios el pipeline de resolución de tipo de comprobante, contingencia y generación de PDF.

#### Scenario: Usuario confirma emisión desde el preview

- **WHEN** el usuario dispara la emisión de un `FiscalDocument` en `PENDIENTE_FACTURACION`
- **THEN** el sistema encola el job de solicitud de CAE y el documento sigue el mismo flujo de resolución de tipo, contingencia y PDF que existía antes de este cambio

#### Scenario: Intento de emitir un comprobante ya emitido

- **WHEN** el usuario dispara la emisión de un `FiscalDocument` que ya tiene CAE asignado
- **THEN** el sistema rechaza la operación sin encolar un nuevo job ni modificar el comprobante existente

#### Scenario: Doble disparo de emisión sobre el mismo comprobante

- **WHEN** el usuario dispara la emisión de un `FiscalDocument` que ya tiene un job de emisión en curso (`waiting`, `active` o `delayed`)
- **THEN** el sistema no crea un segundo job y responde indicando que ya existe uno en curso, sin duplicar la solicitud a ARCA

### Requirement: Visibilidad de comprobantes no emitidos en el panel de administración

Los `FiscalDocument` en `PENDIENTE_FACTURACION` que aún no fueron emitidos manualmente SHALL aparecer en el listado y conteo del API de administración de `pending-fiscal`, igual que los documentos que hoy quedan pendientes por fallas de encolado.

#### Scenario: Documento pendiente de emisión manual en el listado admin

- **WHEN** un `FiscalDocument` está en `PENDIENTE_FACTURACION` esperando que el usuario dispare la emisión
- **THEN** el listado y el conteo del API `pending-fiscal` lo incluyen como pendiente
