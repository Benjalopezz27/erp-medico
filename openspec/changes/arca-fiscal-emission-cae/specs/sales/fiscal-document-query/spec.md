# Spec Delta

## Purpose

Permitir a Administradores y Vendedores consultar el estado y los datos fiscales autorizados del
comprobante asociado a una venta, para soportar la experiencia de descarga que construirá US26-B.

## ADDED Requirements

### Requirement: Consulta autenticada del documento fiscal de una venta

El sistema SHALL exponer `GET /sales/:id/fiscal-document` devolviendo el estado (`EMITIDO`,
`PENDIENTE_FACTURACION`, `RECHAZADO`) y, cuando corresponda, tipo de comprobante, punto de venta,
número, CAE y vencimiento del comprobante asociado a la venta indicada.

#### Scenario: Comprobante ya emitido

- **WHEN** un usuario ADMINISTRADOR o VENDEDOR consulta una venta cuyo `FiscalDocument` está
  `EMITIDO`
- **THEN** el sistema responde 200 con tipo, punto de venta, número, CAE y vencimiento

#### Scenario: Comprobante aún pendiente

- **WHEN** se consulta una venta cuyo `FiscalDocument` sigue `PENDIENTE_FACTURACION`
- **THEN** el sistema responde 200 indicando ese estado, sin datos de CAE

#### Scenario: Venta sin documento fiscal

- **WHEN** se consulta una venta que no requirió factura o no tiene `FiscalDocument`
- **THEN** el sistema responde 404

### Requirement: Autorización por rol

El sistema SHALL requerir sesión autenticada con rol ADMINISTRADOR o VENDEDOR para acceder a este
endpoint, y NUNCA SHALL exponerlo sin autenticación.

#### Scenario: Sin token

- **WHEN** se solicita el endpoint sin un token JWT válido
- **THEN** el sistema responde 401

#### Scenario: Rol no autorizado

- **WHEN** un usuario autenticado con un rol distinto de ADMINISTRADOR o VENDEDOR solicita el
  endpoint
- **THEN** el sistema responde 403
