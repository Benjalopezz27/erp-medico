# Spec Delta

## Purpose

Permitir entregar o archivar el estado de cuenta de un cliente como un documento PDF imprimible.

## ADDED Requirements

### Requirement: Resumen de Cuenta en PDF

El sistema SHALL exponer `GET /customers/:id/account-receivable/pdf` que devuelve un PDF A4 (`application/pdf`) con los datos del cliente, fecha de emisión, saldo total, saldo por antigüedad, facturas pendientes y el ledger completo con saldo corrido. El documento MUST usar los mismos importes que el endpoint JSON de estado de cuenta. Un ledger que no entra en una página SHALL continuar en páginas adicionales.

#### Scenario: Descarga exitosa

- **WHEN** un usuario autorizado pide el PDF de un cliente con movimientos
- **THEN** la respuesta es 200 con `Content-Type: application/pdf` y un archivo que comienza con `%PDF`

#### Scenario: Cliente sin movimientos

- **WHEN** se pide el PDF de un cliente sin cuentas
- **THEN** la respuesta es 200 con un PDF que muestra saldo "0.00" y sin movimientos

#### Scenario: Ledger largo

- **WHEN** el cliente tiene más movimientos de los que entran en una página
- **THEN** el PDF contiene más de una página y ningún movimiento se omite

#### Scenario: Cliente inexistente

- **WHEN** el `:id` no corresponde a un cliente
- **THEN** la respuesta es 404

### Requirement: Acceso al PDF

El endpoint del PDF SHALL requerir autenticación y rol ADMINISTRADOR o VENDEDOR.

#### Scenario: Sin token

- **WHEN** se pide el PDF sin autenticación
- **THEN** la respuesta es 401
