# Spec Delta

## Purpose

Permitir al administrador consultar y modificar los parámetros globales del sistema sin tocar código ni variables de entorno.

## ADDED Requirements

### Requirement: Consulta de configuración efectiva

El sistema SHALL exponer `GET /config` (solo ADMINISTRADOR) con `issuerRazonSocial`, `issuerCuit`, `issuerTaxCondition`, `arcaPuntoVenta` y `operatingCurrency`. Cada valor SHALL resolverse como base de datos, luego variable de entorno, luego default; `operatingCurrency` es `ARS` por defecto y los demás `null` si nadie los definió.

#### Scenario: Sin valores en base

- **WHEN** no hay filas en `system_settings` y `ARCA_CUIT` está definida en el entorno
- **THEN** `issuerCuit` devuelve el valor del entorno y `operatingCurrency` devuelve `ARS`

#### Scenario: Valor en base pisa al entorno

- **WHEN** hay una fila `issuer_razon_social` y también `ARCA_EMISOR_RAZON_SOCIAL`
- **THEN** se devuelve el de la base

### Requirement: Actualización parcial con validación y auditoría

El sistema SHALL exponer `PATCH /config` (solo ADMINISTRADOR) que actualiza solo los campos enviados. CUIT MUST ser un CUIT válido (11 dígitos con dígito verificador), condición fiscal MUST pertenecer a `TaxCondition`, punto de venta MUST ser entero entre 1 y 99999, moneda MUST ser `ARS` o `USD` y razón social MUST ser texto no vacío de hasta 150 caracteres. Un valor inválido SHALL responder 400 sin guardar nada. Cada campo cuyo valor cambia MUST registrar un `AuditLog` con valor anterior y nuevo, en la misma transacción.

#### Scenario: Cambio válido

- **WHEN** un ADMINISTRADOR envía `{ "issuerRazonSocial": "Distribuidora Sur SA" }`
- **THEN** el valor se persiste, `GET /config` lo refleja y existe un registro de auditoría con anterior y nuevo

#### Scenario: CUIT inválido

- **WHEN** se envía un CUIT con dígito verificador incorrecto
- **THEN** responde 400 y no cambia ningún campo del request

#### Scenario: Sin cambios

- **WHEN** se envía el mismo valor que ya está vigente
- **THEN** no se escribe fila ni auditoría

#### Scenario: Rol no autorizado

- **WHEN** un VENDEDOR llama a `GET /config` o `PATCH /config`
- **THEN** responde 403

### Requirement: Consumidores usan el valor efectivo

El PDF fiscal SHALL leer razón social y condición fiscal del emisor del valor efectivo; el PDF de recibo SHALL leer razón social y CUIT; el resolvedor de tipo de factura SHALL leer la condición fiscal. La emisión ante ARCA y el CUIT del PDF fiscal (el mismo que arma el QR y firma el CAE) SHALL seguir usando el entorno.

#### Scenario: Emisor configurado en la UI

- **WHEN** el administrador guarda la razón social y se genera un recibo en PDF
- **THEN** el PDF muestra esa razón social

#### Scenario: Condición fiscal no inscripta

- **WHEN** la condición fiscal efectiva es `MONOTRIBUTO`
- **THEN** el resolvedor devuelve Factura B para cualquier cliente
