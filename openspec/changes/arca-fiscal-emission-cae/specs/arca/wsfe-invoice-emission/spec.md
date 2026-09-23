# Spec Delta

## Purpose

Emitir de forma asíncrona y trazable el comprobante fiscal (Factura A/B o Nota de Crédito A/B)
correspondiente a una venta o devolución ya confirmada, obteniendo un CAE válido de ARCA sin
bloquear ni revertir la confirmación de la operación de negocio.

## ADDED Requirements

### Requirement: Resolución autoritativa de tipo de comprobante
El sistema SHALL determinar el tipo de comprobante (Factura A o Factura B) a partir de la
condición fiscal persistida del cliente (`Customer.taxCondition`/`documentType`) y de la
configuración fiscal del emisor, sin aceptar tipo, punto de venta, numeración, importes ni
alícuotas enviados por el frontend.

#### Scenario: Cliente Responsable Inscripto con CUIT
- **WHEN** se confirma una venta facturable de un cliente con `taxCondition` RESPONSABLE_INSCRIPTO
  o MONOTRIBUTO y documento tipo CUIT
- **THEN** el sistema resuelve el comprobante como Factura A

#### Scenario: Cliente Consumidor Final
- **WHEN** se confirma una venta facturable de un cliente con `taxCondition` CONSUMIDOR_FINAL o
  EXENTO, o sin CUIT válido
- **THEN** el sistema resuelve el comprobante como Factura B

#### Scenario: Nota de Crédito hereda el tipo de la factura original
- **WHEN** se emite una devolución sobre una venta con Factura A ya `EMITIDO`
- **THEN** el sistema emite una Nota de Crédito A asociada verificablemente al comprobante
  original, usando su mismo punto de venta

### Requirement: Construcción del request fiscal desde snapshots persistidos
El sistema SHALL construir los importes y alícuotas del request WSFE exclusivamente a partir de
snapshots históricos de la venta (ítems, netos, conceptos no gravados/exentos, IVA, total)
persistidos al momento de la confirmación, usando aritmética decimal canónica, y SHALL validar que
la suma de componentes coincide con el total antes de invocar WSFE.

#### Scenario: Totales consistentes
- **WHEN** el worker procesa un job de emisión y los componentes (netos + IVA + no gravado) suman
  el total persistido
- **THEN** el sistema invoca `FECAESolicitar` con esos importes

#### Scenario: Totales inconsistentes
- **WHEN** el worker detecta que los componentes persistidos no suman el total persistido
- **THEN** el sistema NO invoca WSFE, marca el documento como `RECHAZADO` con un código de error
  interno estable y registra el detalle sin exponer datos sensibles

### Requirement: Numeración serializada por punto de venta y tipo
El sistema SHALL serializar o bloquear la asignación del próximo número de comprobante por
combinación de punto de venta y tipo de comprobante, de forma que dos jobs concurrentes para la
misma combinación no obtengan ni persistan el mismo número.

#### Scenario: Dos jobs concurrentes del mismo punto de venta y tipo
- **WHEN** dos jobs de emisión para Factura B del mismo punto de venta se procesan al mismo tiempo
- **THEN** el sistema asigna números de comprobante consecutivos y distintos a cada uno, sin
  colisión ni número repetido

### Requirement: Encolado asíncrono post-commit
El sistema SHALL encolar el job de emisión fiscal (`wsfe-emit`) únicamente después de que la
transacción de base de datos que confirma la venta o la devolución haya finalizado con éxito, y
NUNCA SHALL invocar ARCA dentro de esa transacción.

#### Scenario: Encolado exitoso tras confirmar la venta
- **WHEN** una venta facturable termina de confirmarse (venta, stock y cuenta corriente ya
  commiteados)
- **THEN** el sistema encola un job `wsfe-emit` para el `FiscalDocument` recién creado

#### Scenario: Redis no disponible al encolar
- **WHEN** la venta se confirmó exitosamente pero el encolado del job falla porque Redis no está
  disponible
- **THEN** la venta, el stock y la cuenta corriente permanecen confirmados sin reversión, y el
  `FiscalDocument` queda en estado `PENDIENTE_FACTURACION`, observable para recuperación posterior

### Requirement: Idempotencia del job de emisión
El sistema SHALL usar un identificador de job determinista basado en el `fiscalDocumentId`, de
modo que reprocesar el mismo job o recibir una respuesta duplicada de ARCA no cree un segundo
documento fiscal ni sobrescriba un CAE ya persistido con un valor distinto.

#### Scenario: Reintento del mismo job tras éxito previo
- **WHEN** el mismo job de emisión se procesa nuevamente después de que el documento ya quedó
  `EMITIDO` con CAE
- **THEN** el sistema no vuelve a invocar `FECAESolicitar` ni modifica el CAE ya persistido

#### Scenario: Dos workers procesan el mismo documento
- **WHEN** dos instancias del worker reciben el mismo `fiscalDocumentId` por una condición de
  carrera
- **THEN** sólo una obtiene el CAE y lo persiste; la otra converge al mismo resultado sin duplicar
  el documento fiscal

### Requirement: Persistencia atómica del resultado
En caso de éxito, el sistema SHALL persistir en una única actualización atómica el tipo de
comprobante, punto de venta, número, CAE, fecha de vencimiento del CAE, fecha de emisión y el
estado `EMITIDO`, sin modificar `Sale.status`.

#### Scenario: CAE obtenido exitosamente
- **WHEN** WSFE responde `FECAESolicitar` con CAE válido y vencimiento
- **THEN** el sistema persiste atómicamente número, CAE, vencimiento, `issuedAt` y `EMITIDO`, y
  `Sale.status` permanece sin cambios

#### Scenario: ARCA rechaza el comprobante
- **WHEN** WSFE responde con un rechazo o fault
- **THEN** el sistema persiste el `FiscalDocument` en estado `RECHAZADO` con el mensaje de error
  interno, sin alterar `Sale.status` ni el stock ni la cuenta corriente

### Requirement: Proveedor fail-closed por ambiente
El sistema SHALL usar el mock de desarrollo únicamente en desarrollo/test, invocar WSFE de
homologación real en el ambiente de homologación, y SHALL fallar de forma cerrada (rechazar la
emisión, nunca simular un CAE) ante configuración incompleta o en producción hasta que su gate
esté habilitado.

#### Scenario: Configuración de homologación incompleta
- **WHEN** el worker en ambiente `homologation` procesa un job y falta configuración obligatoria
  (CUIT, punto de venta o URL WSFE)
- **THEN** el sistema rechaza la emisión sin contactar ARCA y sin generar un CAE simulado

#### Scenario: Mock de desarrollo no se activa en producción
- **WHEN** `NODE_ENV` es `production`
- **THEN** el sistema nunca usa el mock de ARCA, incluso si `ARCA_ENV` está mal configurado

### Requirement: Sanitización de secretos y datos fiscales sensibles
El sistema SHALL evitar registrar en logs, errores o respuestas HTTP el Token/Sign de WSAA, el
certificado, la contraseña del certificado o el payload SOAP completo.

#### Scenario: Falla de comunicación con WSFE
- **WHEN** ocurre un error de red o un fault SOAP al invocar WSFE
- **THEN** el mensaje de error registrado y devuelto está sanitizado y no contiene Token/Sign,
  certificado, contraseña ni el XML completo de la solicitud/respuesta
