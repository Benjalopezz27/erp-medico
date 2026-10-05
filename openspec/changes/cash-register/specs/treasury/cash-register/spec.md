# Spec Delta

## Purpose

Controlar el efectivo por turno: abrir la caja, seguir sus movimientos y cerrarla con arqueo.

## ADDED Requirements

### Requirement: Apertura de caja

El sistema SHALL permitir abrir la caja con un saldo inicial mayor o igual a 0 con 2 decimales. Solo MUST existir una caja abierta a la vez.

#### Scenario: Apertura correcta

- **WHEN** el administrador abre la caja con saldo inicial $1000.00 y no hay caja abierta
- **THEN** queda una caja abierta con ese saldo y la fecha de apertura

#### Scenario: Caja ya abierta

- **WHEN** se intenta abrir la caja con otra ya abierta
- **THEN** el sistema responde 409 y no crea un turno nuevo

### Requirement: Estado y movimientos del turno

El sistema SHALL informar el estado actual: si hay caja abierta, su saldo inicial, el saldo esperado (saldo inicial más ingresos menos egresos de `EFECTIVO` desde la apertura) y los movimientos del turno; si está cerrada, los datos del último cierre.

#### Scenario: Saldo esperado

- **WHEN** la caja abrió con $1000.00 y hay un ingreso de $60.00 y un egreso de $10.00 en efectivo desde la apertura
- **THEN** el saldo esperado es $1050.00

### Requirement: Cierre con arqueo

Al cerrar, el sistema SHALL recibir el saldo contado, calcular la diferencia (contado menos esperado) y guardar esperado, contado y diferencia. Si la diferencia no es 0, la observación MUST ser obligatoria y el sistema SHALL registrar en `EFECTIVO` un movimiento de ajuste por la diferencia absoluta (ingreso si sobra, egreso si falta). El cierre SHALL quedar auditado y el turno cerrado MUST NOT modificarse.

#### Scenario: Cierre sin diferencia

- **WHEN** el saldo contado es igual al esperado
- **THEN** la caja se cierra con diferencia 0 y sin movimiento de ajuste

#### Scenario: Faltante sin observación

- **WHEN** el saldo contado es menor al esperado y no hay observación
- **THEN** el sistema responde 400 y la caja sigue abierta

#### Scenario: Faltante con observación

- **WHEN** el contado es $40.00 menor al esperado y hay observación
- **THEN** la caja se cierra con diferencia −40.00 y existe un egreso de ajuste de $40.00 en `EFECTIVO`

#### Scenario: Cierre sin caja abierta

- **WHEN** se intenta cerrar y no hay caja abierta
- **THEN** el sistema responde 409
