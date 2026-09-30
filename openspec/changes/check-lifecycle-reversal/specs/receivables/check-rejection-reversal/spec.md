# Spec Delta

## Purpose

Revertir de forma atómica la aplicación de un cobro cuando su cheque es rechazado, reabriendo la deuda del cliente.

## ADDED Requirements

### Requirement: Rechazo atómico de cheque

`PATCH /checks/:id/reject` (solo ADMINISTRADOR, con `reason` opcional) SHALL aceptar cheques EN_CARTERA o DEPOSITADO y ejecutar en una única transacción: bloquear el cheque y las cuentas afectadas (orden por id); pasar el cheque a `RECHAZADO`; por cada `PaymentAllocation` del cobro, sumar el monto aplicado a `currentBalance` y escribir un movimiento `REVERSION_CHEQUE` con `previousBalance`, `subsequentBalance`, `paymentId` y `userId`; marcar el cobro `REVERTIDO`; registrar auditoría del cheque y del cobro. Si algo falla MUST NOT quedar ningún cambio.

#### Scenario: Rechazo reabre dos facturas canceladas

- **WHEN** se rechaza el cheque de $1000 que canceló dos facturas de $600 y $400
- **THEN** ambas vuelven a `PENDIENTE` con saldo "600.00" y "400.00", existen dos movimientos `REVERSION_CHEQUE` y el saldo del cliente sube $1000.00

#### Scenario: Factura parcialmente pagada

- **WHEN** el cobro había aplicado $100.00 a una factura de $300.00 (saldo $200.00)
- **THEN** tras el rechazo su saldo es "300.00" y su estado `PENDIENTE`; si ya tenía un pago previo de $50.00 su saldo vuelve a "250.00" y su estado `PARCIAL`

#### Scenario: Falla a mitad de la reversión

- **WHEN** falla la reposición de una de las facturas
- **THEN** el cheque sigue en su estado previo, el cobro `REGISTRADO` y ningún saldo ni movimiento cambia

### Requirement: Estados no rechazables

El sistema MUST rechazar con 409 (`CHECK_INVALID_TRANSITION`) el rechazo de un cheque en estado `RECIBIDO`, `ENDOSADO` o `RECHAZADO`, sin cambios. El rechazo repetido no duplica movimientos.

#### Scenario: Doble rechazo

- **WHEN** se rechaza dos veces el mismo cheque (también en concurrencia)
- **THEN** el primero se aplica y el segundo recibe 409 sin nuevos movimientos

#### Scenario: Cheque endosado

- **WHEN** se intenta rechazar un cheque ENDOSADO
- **THEN** la respuesta es 409 y no cambia nada

### Requirement: Invariante del ledger tras la reversión

Después de cualquier secuencia de cobros y rechazos, `currentBalance` de cada cuenta MUST ser igual a `originalAmount - sum(NOTA_CREDITO) - sum(PAGO) + sum(REVERSION_CHEQUE)`, y el saldo del cliente igual a la suma con signo de su historial.

#### Scenario: Ledger del cliente tras rechazo

- **WHEN** se consulta `GET /customers/:id/account-receivable` tras un rechazo
- **THEN** el ledger muestra los movimientos `REVERSION_CHEQUE` sumando y el saldo corrido coincide con el saldo del resumen

### Requirement: Confirmación con impacto en la interfaz

La interfaz SHALL mostrar, antes de confirmar el rechazo, las facturas que se reabren y el aumento de saldo del cliente, y solo ofrecer la acción en cheques EN_CARTERA o DEPOSITADO.

#### Scenario: Modal de rechazo

- **WHEN** el administrador pulsa "Registrar Rechazo" en un cheque EN_CARTERA
- **THEN** el modal lista cada factura con el monto que se repone y el total, y recién al confirmar se envía el pedido
