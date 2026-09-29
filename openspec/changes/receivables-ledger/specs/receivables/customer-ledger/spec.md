# Spec Delta

## Purpose

Registrar cada venta a crédito como un movimiento inmutable del ledger de cuenta corriente y permitir consultar el estado de cuenta de un cliente reconstruido por movimientos.

## ADDED Requirements

### Requirement: Movimiento FACTURA por venta a crédito

El sistema SHALL registrar un movimiento `FACTURA` (+) en el ledger, dentro de la misma transacción que crea la venta a crédito, con `previousBalance = 0`, `subsequentBalance = total de la venta` y el usuario que registró la venta. Las cuentas a crédito preexistentes sin movimiento `FACTURA` SHALL recibir uno equivalente mediante migración. Una cuenta MUST tener como máximo un movimiento `FACTURA`.

#### Scenario: Venta a crédito nueva

- **WHEN** se confirma una venta a crédito de $1000.00 para un cliente
- **THEN** existe una cuenta con saldo $1000.00 y un movimiento `FACTURA` de $1000.00 con saldo posterior $1000.00

#### Scenario: Falla la creación de la venta

- **WHEN** la transacción de la venta se revierte
- **THEN** no queda cuenta ni movimiento `FACTURA`

#### Scenario: Cuenta preexistente sin movimiento

- **WHEN** se aplica la migración sobre una cuenta creada antes de este cambio
- **THEN** la cuenta tiene un movimiento `FACTURA` por su monto original y volver a correr la migración no duplica el movimiento

### Requirement: Estado de cuenta de un cliente

El sistema SHALL exponer `GET /customers/:id/account-receivable` con: saldo total (suma de saldos de sus cuentas), cantidad de facturas PENDIENTE y PARCIAL, límite de crédito, indicador de límite excedido y saldo por antigüedad en tramos 0-30, 31-60 y +60 días contados desde la fecha de creación de cada factura con saldo pendiente. Los importes MUST devolverse como strings decimales de 2 decimales.

#### Scenario: Tres ventas a crédito

- **WHEN** un cliente tiene 3 ventas a crédito de $100.00, $200.00 y $300.00 sin cobros
- **THEN** el saldo total es "600.00" y las facturas pendientes son 3

#### Scenario: Saldo por antigüedad

- **WHEN** un cliente tiene una factura de 10 días con saldo $100.00 y otra de 45 días con saldo $50.00
- **THEN** el tramo 0-30 es "100.00", el tramo 31-60 es "50.00" y el tramo +60 es "0.00"

#### Scenario: Cuenta cancelada no suma

- **WHEN** una factura tiene estado CANCELADO
- **THEN** no cuenta como factura pendiente ni aporta al saldo ni a la antigüedad

#### Scenario: Límite de crédito excedido

- **WHEN** el límite de crédito del cliente es mayor a 0 y el saldo total lo supera
- **THEN** el indicador de límite excedido es verdadero y las ventas siguen sin bloquearse

#### Scenario: Cliente sin límite configurado

- **WHEN** el límite de crédito del cliente es 0
- **THEN** el indicador de límite excedido es falso

#### Scenario: Cliente inexistente

- **WHEN** el `:id` no corresponde a un cliente
- **THEN** la respuesta es 404

### Requirement: Ledger cronológico con saldo corrido

El sistema SHALL devolver, en el mismo endpoint, los movimientos del cliente paginados en orden cronológico ascendente con: fecha, tipo (`FACTURA`, `NOTA_CREDITO`, y los tipos futuros `PAGO` y `REVERSION_CHEQUE`), documento de referencia, importe con signo y saldo corrido del cliente. `FACTURA` y `REVERSION_CHEQUE` SHALL sumar; `PAGO` y `NOTA_CREDITO` SHALL restar. El saldo corrido MUST calcularse sobre todos los movimientos del cliente, no solo sobre la página pedida, y el saldo corrido del último movimiento MUST coincidir con el saldo total.

#### Scenario: Cinco movimientos

- **WHEN** un cliente tiene FACTURA $1000, FACTURA $500, NOTA_CREDITO $200, FACTURA $300 y NOTA_CREDITO $100
- **THEN** los saldos corridos son 1000.00, 1500.00, 1300.00, 1600.00 y 1500.00 y el saldo total es "1500.00"

#### Scenario: Segunda página

- **WHEN** se pide la página 2 de un ledger paginado
- **THEN** el primer movimiento de esa página trae el saldo corrido acumulado de todos los movimientos anteriores, no cero

#### Scenario: Empate de fecha

- **WHEN** dos movimientos comparten el mismo instante de creación
- **THEN** el orden es determinístico y `FACTURA` precede a los demás tipos

#### Scenario: Cliente sin movimientos

- **WHEN** el cliente no tiene cuentas
- **THEN** el saldo total es "0.00" y la lista de movimientos está vacía

### Requirement: Coherencia entre saldo y movimientos

Para cada cuenta, el saldo actual MUST ser igual a la suma con signo de sus movimientos. El ledger es de solo inserción: el sistema MUST NOT modificar ni borrar movimientos existentes.

#### Scenario: Cuenta con nota de crédito

- **WHEN** una cuenta de $1000.00 recibe una nota de crédito de $400.00
- **THEN** el saldo de la cuenta es $600.00 y coincide con FACTURA $1000.00 menos NOTA_CREDITO $400.00

### Requirement: Acceso a la cuenta corriente

Los endpoints de cuenta corriente SHALL requerir autenticación y rol ADMINISTRADOR o VENDEDOR.

#### Scenario: Sin token

- **WHEN** se llama a un endpoint de cuenta corriente sin autenticación
- **THEN** la respuesta es 401

#### Scenario: Vendedor consulta

- **WHEN** un VENDEDOR consulta la cuenta corriente de un cliente
- **THEN** la respuesta es 200
