# Spec Delta

## Purpose

Generar de forma determinista y auditable el QR fiscal oficial y el PDF del comprobante para todo
`FiscalDocument` que ya cuente con CAE autoritativo, sin invalidar ni reemitir la emisión fiscal
ante una falla documental.

## ADDED Requirements

### Requirement: Payload QR oficial determinista

El sistema SHALL construir el payload QR fiscal conforme al contrato oficial de AFIP (RG
4291/2018) exclusivamente a partir de datos persistidos del `FiscalDocument`/venta/cliente, y
SHALL producir el mismo payload byte a byte para el mismo comprobante en ejecuciones repetidas.

#### Scenario: Comprobante emitido con CAE

- **WHEN** un `FiscalDocument` pasa a `arcaStatus: EMITIDO` con CAE y vencimiento persistidos
- **THEN** el sistema construye el payload QR con `cuit`, `ptoVta`, `tipoCmp`, `nroCmp`, `importe`,
  `tipoDocRec`, `nroDocRec`, `tipoCodAut: "E"` y `codAut` derivados de esos datos, y lo persiste en
  `qrCodeData`

#### Scenario: Regeneración idempotente

- **WHEN** el payload QR se recalcula para un `FiscalDocument` sin cambios en sus datos fuente
- **THEN** el resultado es idéntico al previamente persistido

### Requirement: Generación de PDF sólo con CAE autoritativo

El sistema NUNCA SHALL generar un PDF fiscal para un `FiscalDocument` cuyo `arcaStatus` no sea
`EMITIDO`, y el PDF SHALL reproducir los snapshots fiscales históricos de la venta (ítems, netos,
IVA, total), nunca precios o datos maestros actuales de producto/cliente.

#### Scenario: Documento sin CAE

- **WHEN** se ejecuta el job de generación documental sobre un `FiscalDocument` en
  `PENDIENTE_FACTURACION` o `RECHAZADO`
- **THEN** el job no genera ningún PDF y termina sin modificar el documento

#### Scenario: Factura A/B y Nota de Crédito A/B

- **WHEN** una Factura A, Factura B, Nota de Crédito A o Nota de Crédito B queda `EMITIDO`
- **THEN** el sistema genera su propio PDF con emisor, receptor, tipo y número, fecha, ítems,
  netos, IVA, total, CAE, vencimiento y la imagen del QR embebida

### Requirement: Job idempotente por documento fiscal

El sistema SHALL encolar la generación documental con un identificador de job determinista por
`fiscalDocumentId`, y SHALL evitar que ejecuciones repetidas o concurrentes del job dupliquen el
artefacto o produzcan versiones contradictorias.

#### Scenario: Reintento sin cambios

- **WHEN** el job de generación documental se ejecuta más de una vez para el mismo
  `fiscalDocumentId` sin cambios en la versión de template ni en el checksum de los datos fuente
- **THEN** el sistema no regenera el artefacto y conserva el existente

#### Scenario: Ejecución concurrente

- **WHEN** dos ejecuciones del job para el mismo `fiscalDocumentId` corren en paralelo
- **THEN** el sistema persiste un único artefacto final consistente, sin condición de carrera
  visible en el resultado

#### Scenario: Cambio de versión de template o checksum

- **WHEN** la versión de template del PDF o el checksum de los datos fuente de un documento ya
  `DISPONIBLE` cambian
- **THEN** el sistema reemplaza el artefacto existente por uno nuevo

### Requirement: Falla documental no afecta el estado fiscal

Una falla en la generación del PDF NUNCA SHALL cambiar `arcaStatus`, invalidar el CAE ni disparar
una reemisión ante ARCA; el sistema SHALL permitir reintentar sólo la generación documental.

#### Scenario: Error de render

- **WHEN** el job de generación documental falla (por ejemplo, error de render del template)
- **THEN** el `FiscalDocument` conserva `arcaStatus: EMITIDO` y su CAE, y queda en estado de
  artefacto recuperable

### Requirement: Persistencia binaria durable con trazabilidad

El sistema SHALL persistir el PDF como artefacto privado en almacenamiento durable propio (no
filesystem efímero, no proveedor externo no aprobado), junto con checksum, tamaño, versión de
template y fecha de generación.

#### Scenario: Artefacto disponible

- **WHEN** la generación documental concluye exitosamente
- **THEN** el sistema persiste el binario del PDF junto con su checksum SHA-256, tamaño en bytes,
  versión de template y fecha de generación en el mismo registro del `FiscalDocument`
