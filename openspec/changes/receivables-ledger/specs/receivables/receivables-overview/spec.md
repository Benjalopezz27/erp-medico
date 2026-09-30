# Spec Delta

## Purpose

Dar una vista global de deudores por cliente, con saldo, deuda más antigua y estado de morosidad, para priorizar la cobranza.

## ADDED Requirements

### Requirement: Listado global de cuentas por cliente

El sistema SHALL exponer `GET /receivables` con una fila por cliente que tenga al menos una factura PENDIENTE o PARCIAL: cliente, cantidad de facturas pendientes, saldo total, fecha de la deuda más antigua, tramos de antigüedad (0-30, 31-60, +60) y estado. Un cliente SHALL estar `MOROSO` si su deuda más antigua supera 30 días, y `AL_DIA` en caso contrario. La lista SHALL ir paginada y ordenada por saldo total descendente.

#### Scenario: Cliente moroso

- **WHEN** un cliente tiene una factura con saldo y 45 días de antigüedad
- **THEN** aparece con estado `MOROSO`

#### Scenario: Cliente al día

- **WHEN** todas las facturas con saldo de un cliente tienen 30 días o menos
- **THEN** aparece con estado `AL_DIA`

#### Scenario: Cliente sin deuda

- **WHEN** todas las facturas de un cliente están CANCELADO
- **THEN** el cliente no aparece en el listado

### Requirement: Filtros del listado global

El listado SHALL admitir filtrar por texto sobre nombre o documento del cliente y por estado (`MOROSO` / `AL_DIA`).

#### Scenario: Filtro por estado

- **WHEN** se pide el listado con estado `MOROSO`
- **THEN** solo se devuelven clientes morosos y el total de la paginación cuenta solo esos

#### Scenario: Búsqueda por nombre

- **WHEN** se pide el listado con un texto que coincide parcialmente con el nombre de un cliente
- **THEN** se devuelven solo los clientes que coinciden

### Requirement: Acceso al listado global

`GET /receivables` SHALL requerir autenticación y rol ADMINISTRADOR o VENDEDOR. `GET /receivables/status` SHALL seguir respondiendo como hasta ahora.

#### Scenario: Sin token

- **WHEN** se llama a `GET /receivables` sin autenticación
- **THEN** la respuesta es 401
