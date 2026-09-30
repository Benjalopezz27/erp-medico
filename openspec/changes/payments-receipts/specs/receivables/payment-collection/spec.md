# Spec Delta

## Purpose

Registrar cobros de clientes y aplicarlos a sus facturas a crédito, manteniendo el ledger y los saldos consistentes.

## ADDED Requirements

### Requirement: Registro atómico de cobro

El sistema SHALL exponer `POST /payments` (ADMINISTRADOR y VENDEDOR) que registra un cobro con `customerId`, `paymentMethod` (`EFECTIVO` o `TRANSFERENCIA`), `notes` opcional y la forma de aplicación. Cobro, aplicaciones, movimientos `PAGO`, actualización de saldos y recibo MUST persistirse en una única transacción: si algo falla no queda nada. Cualquier otro medio SHALL rechazarse con 400.

#### Scenario: Cobro exitoso

- **WHEN** se registra un cobro en efectivo de $250.00 aplicado a facturas del cliente
- **THEN** existen el cobro, sus aplicaciones, un movimiento `PAGO` por aplicación y un recibo, y el saldo del cliente baja $250.00

#### Scenario: Falla parcial

- **WHEN** una de las aplicaciones falla la validación
- **THEN** no se crea cobro, recibo ni movimiento y ningún saldo cambia

#### Scenario: Medio no soportado

- **WHEN** el `paymentMethod` es `CHEQUE`
- **THEN** la respuesta es 400 y no se persiste nada

### Requirement: Aplicación dirigida

En modo dirigido el cuerpo SHALL incluir una lista de `{ accountReceivableId, amount }`. Cada factura MUST pertenecer al cliente, tener saldo pendiente y `amount` MUST ser mayor a 0 y no exceder su saldo. El total cobrado es la suma de los montos. Una factura no puede repetirse en la lista.

#### Scenario: Pago parcial de una factura

- **WHEN** se aplican $100.00 a una factura con saldo $200.00
- **THEN** su saldo es "100.00", su estado `PARCIAL` y el movimiento `PAGO` tiene saldo anterior "200.00" y posterior "100.00"

#### Scenario: Cancelación total

- **WHEN** se aplica el saldo completo de una factura
- **THEN** su saldo es "0.00" y su estado `CANCELADO`

#### Scenario: Monto mayor al saldo

- **WHEN** se aplican $300.00 a una factura con saldo $200.00
- **THEN** la respuesta es 409 y no se persiste nada

#### Scenario: Factura de otro cliente

- **WHEN** la lista incluye una factura que pertenece a otro cliente
- **THEN** la respuesta es 400 y no se persiste nada

### Requirement: Aplicación por antigüedad

En modo por antigüedad el cuerpo SHALL incluir `totalAmount`. El sistema MUST aplicarlo a las facturas del cliente con saldo pendiente ordenadas por fecha de creación ascendente (desempate por id), cancelando cada una antes de pasar a la siguiente; la última puede quedar parcial. El monto MUST ser mayor a 0 y no exceder el saldo total del cliente.

#### Scenario: Cascada

- **WHEN** un cliente tiene facturas con saldo de $150.00 (vieja), $200.00 y $100.00 (nueva) y cobra $250.00 por antigüedad
- **THEN** la primera queda `CANCELADO`, la segunda `PARCIAL` con saldo "100.00" y la tercera no cambia

#### Scenario: Monto excede la deuda

- **WHEN** el cliente debe $450.00 y cobra $500.00 por antigüedad
- **THEN** la respuesta es 409 y no se persiste nada

### Requirement: Concurrencia e importes

El sistema MUST bloquear las facturas involucradas durante la transacción para que dos cobros simultáneos no dejen saldo negativo. Todos los importes SHALL calcularse con decimales exactos y devolverse como strings de 2 decimales.

#### Scenario: Cobros simultáneos

- **WHEN** dos cobros de $100.00 se envían a la vez sobre una factura con saldo $150.00
- **THEN** exactamente uno se registra y el otro responde 409

### Requirement: Cliente inexistente y autorización

El sistema SHALL responder 404 si el cliente no existe y 401 sin token.

#### Scenario: Cliente inexistente

- **WHEN** `customerId` no existe
- **THEN** la respuesta es 404

### Requirement: Registrar cobro desde la cuenta corriente

El frontend SHALL habilitar "Registrar Cobro" en la pestaña Cuenta Corriente y ofrecer `/payments/new` con selección de cliente, modo (antigüedad / manual), monto por factura, medio y validación de que el total aplicado coincide con el cobrado. Al confirmar SHALL navegar al recibo.

#### Scenario: Cobro desde el cliente

- **WHEN** el usuario abre "Registrar Cobro" desde la cuenta corriente de un cliente
- **THEN** el formulario llega con el cliente preseleccionado y sus facturas pendientes

#### Scenario: Diferencia entre aplicado y cobrado

- **WHEN** el total aplicado no coincide con el total cobrado
- **THEN** el botón de confirmar permanece deshabilitado
