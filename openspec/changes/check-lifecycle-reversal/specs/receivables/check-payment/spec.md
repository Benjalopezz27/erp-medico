# Spec Delta

## Purpose

Permitir cobrar con cheque de terceros, registrando el cheque como parte del cobro y reflejándolo en el recibo.

## ADDED Requirements

### Requirement: Cobro con cheque

`POST /payments` SHALL aceptar `paymentMethod = CHEQUE` junto con un objeto `check` con `bankName`, `checkNumber`, `drawerName`, `dueDate` e `issueDate` opcional. El cheque MUST cubrir exactamente el total cobrado (su monto es el del cobro). Cobro, aplicaciones, movimientos `PAGO`, recibo y `Check` en estado `RECIBIDO` MUST persistirse en una única transacción. Con medio `EFECTIVO` o `TRANSFERENCIA` el objeto `check` SHALL rechazarse con 400; con `CHEQUE` sin `check` también.

#### Scenario: Cobro con cheque exitoso

- **WHEN** se registra un cobro de $200.00 con cheque del banco Galicia N° 12345678 aplicado a dos facturas
- **THEN** existen el cobro, las aplicaciones, los movimientos `PAGO`, el recibo y un `Check` `RECIBIDO` de $200.00 vinculado al cobro y al cliente

#### Scenario: Falla parcial

- **WHEN** la aplicación a una factura falla la validación
- **THEN** no se crea cobro, recibo, movimiento ni cheque

#### Scenario: Datos de cheque inconsistentes

- **WHEN** el medio es `CHEQUE` y falta `check`, o el medio es `EFECTIVO` y se envía `check`
- **THEN** la respuesta es 400 con código `CHECK_DATA_INVALID` y no se persiste nada

### Requirement: Cheque duplicado

El sistema MUST rechazar con 409 (`CHECK_DUPLICATE`) un cheque cuyo par `bankName` + `checkNumber` ya existe, sin crear el cobro.

#### Scenario: Mismo banco y número

- **WHEN** se registra un cobro con un banco y número ya registrados
- **THEN** la respuesta es 409 y no cambia ningún saldo

### Requirement: Recibo con datos del cheque

El detalle y el PDF del recibo SHALL incluir banco y número del cheque cuando el medio es `CHEQUE`, y una marca visible de "REVERTIDO" cuando el cobro está revertido.

#### Scenario: Recibo de cobro con cheque

- **WHEN** se consulta el recibo de un cobro con cheque
- **THEN** el medio de pago muestra "Cheque (Banco Galicia, N° 12345678)"

#### Scenario: Recibo de cobro revertido

- **WHEN** el cheque del cobro fue rechazado
- **THEN** el detalle del recibo informa `paymentStatus = REVERTIDO` y el PDF lo indica
