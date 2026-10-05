# Proposal

## Why

US-37 a US-45 (issue #11) piden los reportes operativos y financieros del Administrador. El motor de exportación (`export-engine`) ya existe: falta cada definición de reporte y su pantalla.

## What Changes

- Nueve definiciones de reporte registradas en `REPORT_DEFINITIONS`, cada una una consulta SQL de solo lectura con filtros validados: `sales` (US-37), `profitability` (US-38), `stock-valuation` (US-39), `stock-movements` (US-40), `purchases` (US-41), `receivables-aging` (US-42), `collections` (US-43), `checks-portfolio` (US-44), `supplier-invoices` (US-45).
- Fila de totales al pie para los reportes con importes (ventas, rentabilidad, valorización, cobranzas, aging).
- Frontend: `/reports` pasa a ser un índice con los nueve reportes y `/reports/$type` una pantalla genérica guiada por configuración (filtros, vista previa en tabla, botones Excel y PDF). Todos los reportes exportan Excel y PDF (el DoD del sprint lo exige, aunque el backlog pide solo Excel en siete de ellos).
- Fuera de alcance: reportes del wireframe sin US (IVA, devoluciones, caja por período), programación o envío por correo, gráficos.

## Capabilities

### New Capabilities

- `reports/operational-reports`: los nueve reportes y su pantalla.

### Modified Capabilities

(ninguna)

## Impact

- Backend: `modules/reports/` (definiciones, helper de filtros, módulo). Sin migraciones ni dependencias nuevas.
- Frontend: `features/reports/`, páginas `/reports` y `/reports/$type`.
- Supuestos que se declaran: (1) US-45 nombra el estado `PENDIENTE_FACTURACION`, que no existe en facturas de proveedor (es de ARCA en ventas); se toma como "pendiente" la factura `AUTORIZADA` aún sin confirmar, junto con `OBSERVADA`. (2) Rentabilidad usa el costo actual del producto, porque la venta no guarda snapshot de costo. (3) Ventas incluye solo `CONFIRMADA`; cobranzas excluye cobros `REVERTIDO`. (4) En aging, lo no vencido entra en el tramo 0–30.
- Zona sensible: lectura únicamente; no toca ARCA ni escribe datos.
