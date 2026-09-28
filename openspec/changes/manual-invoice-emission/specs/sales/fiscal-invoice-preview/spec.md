# Spec Delta

## Purpose

Permite al usuario ver, antes de emitir, cómo va a quedar el comprobante fiscal de una venta (tipo, receptor, ítems, totales) sin disparar ningún llamado a ARCA ni consumir numeración.

## ADDED Requirements

### Requirement: Consulta de preview de comprobante

El sistema SHALL exponer una consulta de preview para un `FiscalDocument` en estado `PENDIENTE_FACTURACION`, que devuelve el tipo de comprobante calculado (A/B), los datos del receptor (razón social/nombre, CUIT/DNI o "Consumidor Final"), el detalle de ítems y los totales de la venta asociada.

#### Scenario: Preview de venta pendiente de facturar

- **WHEN** el usuario solicita el preview de una venta cuyo `FiscalDocument` está en `PENDIENTE_FACTURACION`
- **THEN** el sistema devuelve tipo de comprobante calculado, receptor, ítems y totales, sin CAE ni número de comprobante asignado

#### Scenario: Preview no reserva numeración ni llama a ARCA

- **WHEN** el usuario solicita el preview de una venta pendiente de facturar
- **THEN** el sistema no reserva numeración de comprobante ni realiza ninguna solicitud a ARCA como efecto de la consulta

#### Scenario: Preview de venta ya emitida

- **WHEN** el usuario solicita el preview de una venta cuyo `FiscalDocument` ya tiene CAE asignado
- **THEN** el sistema devuelve los datos reales del comprobante ya emitido (tipo, número, CAE) en lugar de un cálculo preliminar

#### Scenario: Preview de venta sin factura requerida

- **WHEN** el usuario solicita el preview de una venta que no requiere factura (`requiresFiscalInvoice` es `false`)
- **THEN** el sistema responde con un error indicando que la venta no tiene comprobante fiscal asociado
