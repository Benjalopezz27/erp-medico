# Spec Delta

## Purpose

Registrar cada entrada y salida de dinero por canal (efectivo, bancos, cheques en cartera) y mostrar el saldo consolidado.

## ADDED Requirements

### Requirement: Libro de movimientos inmutable

El sistema SHALL mantener tres cuentas (`EFECTIVO`, `BANCOS`, `CHEQUES_CARTERA`) y un libro de movimientos con tipo `INGRESO` o `EGRESO`, monto mayor a 0 con 2 decimales, concepto, referencia opcional y usuario. Los movimientos MUST ser inmutables: no se actualizan ni se eliminan. El saldo de una cuenta SHALL ser la suma de ingresos menos egresos.

#### Scenario: Saldo desde movimientos

- **WHEN** una cuenta tiene ingresos por $300.00 y un egreso por $100.00
- **THEN** su saldo es $200.00

#### Scenario: Movimiento inmutable

- **WHEN** se intenta modificar o borrar un movimiento existente
- **THEN** la base de datos lo rechaza

### Requirement: Movimientos automáticos por cobros y ventas

Al registrar un cobro, el sistema SHALL crear en la misma transacción un `INGRESO` por el total en la cuenta del medio de pago: `EFECTIVO`→`EFECTIVO`, `TRANSFERENCIA`→`BANCOS`, `CHEQUE`→`CHEQUES_CARTERA`. Al registrar una venta que no es a cuenta corriente, SHALL crear un `INGRESO` por el total en `EFECTIVO` si el medio es efectivo, en `CHEQUES_CARTERA` si es cheque y en `BANCOS` para transferencia, débito, crédito y QR. Si el movimiento falla, la operación de origen MUST revertirse completa.

#### Scenario: Cobro en efectivo

- **WHEN** se registra un cobro en efectivo de $250.00
- **THEN** existe un ingreso de $250.00 en `EFECTIVO` referenciando el cobro

#### Scenario: Venta a cuenta corriente

- **WHEN** se registra una venta a cuenta corriente
- **THEN** no se crea ningún movimiento de tesorería

#### Scenario: Falla de tesorería

- **WHEN** el movimiento no puede guardarse
- **THEN** no queda el cobro ni la venta

### Requirement: Movimientos por ciclo de vida del cheque

Al depositar un cheque el sistema SHALL registrar un `EGRESO` en `CHEQUES_CARTERA` y un `INGRESO` en `BANCOS` por su monto. Al endosarlo, un `EGRESO` en `CHEQUES_CARTERA`. Al rechazarlo, un `EGRESO` por su monto en `BANCOS` si estaba `DEPOSITADO` o en `CHEQUES_CARTERA` en otro caso. Todos MUST registrarse en la transacción de la transición.

#### Scenario: Depósito

- **WHEN** se deposita un cheque de $500.00 en cartera
- **THEN** `CHEQUES_CARTERA` baja $500.00 y `BANCOS` sube $500.00

#### Scenario: Rechazo de cheque depositado

- **WHEN** se rechaza un cheque `DEPOSITADO` de $500.00
- **THEN** `BANCOS` baja $500.00

### Requirement: Resumen y listado de movimientos

El sistema SHALL exponer `GET /treasury/summary` con el saldo de cada cuenta y `GET /treasury/movements` paginado, con filtros opcionales por cuenta, tipo y rango de fechas, ordenado del más reciente al más antiguo. Ambos MUST ser solo para ADMINISTRADOR.

#### Scenario: Filtro por cuenta

- **WHEN** se filtra por `BANCOS`
- **THEN** solo se devuelven movimientos de esa cuenta

#### Scenario: Rol no autorizado

- **WHEN** un VENDEDOR consulta el resumen
- **THEN** responde 403

### Requirement: Movimiento manual

El sistema SHALL permitir a un ADMINISTRADOR registrar con `POST /treasury/movements` un `INGRESO` o `EGRESO` en `EFECTIVO` o `BANCOS` con monto y concepto obligatorios. La cuenta `CHEQUES_CARTERA` MUST rechazarse con 400 porque solo se mueve por cheques.

#### Scenario: Retiro manual

- **WHEN** el administrador registra un egreso de $10.000,00 en `EFECTIVO` con concepto "Gasto: librería"
- **THEN** el saldo de `EFECTIVO` baja $10.000,00 y el movimiento muestra al usuario

#### Scenario: Cuenta de cheques

- **WHEN** se intenta un movimiento manual en `CHEQUES_CARTERA`
- **THEN** responde 400
