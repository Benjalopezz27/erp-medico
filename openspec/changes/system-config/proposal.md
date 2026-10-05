# Proposal

## Why

Los datos del emisor (razón social, CUIT, condición fiscal), el punto de venta ARCA y la moneda operativa hoy solo se cambian por variables de entorno y redeploy. US-46 (issue #11) permite al administrador verlos y editarlos desde la UI, con persistencia en base de datos y auditoría.

## What Changes

- Tabla `system_settings` (clave/valor) y `GET /config` / `PATCH /config`, solo ADMINISTRADOR. Claves: `issuer_razon_social`, `issuer_cuit`, `issuer_tax_condition`, `arca_punto_venta`, `operating_currency`.
- Valor efectivo = valor en base de datos, si no hay, la variable de entorno actual (`ARCA_EMISOR_RAZON_SOCIAL`, `ARCA_CUIT`, `ARCA_EMISOR_TAX_CONDITION`, `ARCA_PUNTO_VENTA`), si no hay, default (`ARS`).
- Consumidores que pasan a leer el valor efectivo: PDF fiscal (emisor), PDF de recibo (emisor) y `InvoiceTypeResolverService` (condición fiscal).
- La emisión WSFE (`ArcaHomologationService`, orquestador de contingencia) **sigue leyendo CUIT y punto de venta de env** hasta el Go-Live: el certificado ARCA está atado al CUIT y cambiarlo desde la UI podría emitir mal un comprobante. La UI lo avisa.
- Cada cambio queda en `AuditLog` (valor anterior y nuevo).
- Frontend: pestaña "General" en `/settings` (solo ADMINISTRADOR) con el formulario. La tolerancia de costos sigue en la pestaña "Compras" (`purchase_settings`, sin migrar).
- Fuera de alcance: migrar `purchase_settings`, que la emisión WSFE lea de base de datos, cambios de moneda con conversión, seed de datos reales.

## Capabilities

### New Capabilities

- `config/system-config`: parámetros globales editables del emisor, punto de venta y moneda.

### Modified Capabilities

(ninguna)

## Impact

- Backend: `modules/config/` (entidad, DTO, service, controller), migración `1700000000032-*`, `queue/processors/pdf-generate.processor.ts`, `payments/receipts.controller.ts`, `arca/services/invoice-type-resolver.service.ts`.
- Shared types: `ISystemConfig`.
- Frontend: `features/system-config/`, `SettingsPage`.
- Zona sensible (AGENTS.md §8): nada toca la emisión ARCA ni numeración. La migración solo crea una tabla.
