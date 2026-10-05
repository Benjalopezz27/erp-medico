# Spec Delta

## Purpose

Entregar al Administrador reportes de ventas, stock, compras, cobranzas, cheques y deuda, visibles en pantalla y exportables.

## ADDED Requirements

### Requirement: Reportes disponibles y filtros

El sistema SHALL ofrecer en `GET /reports/:type` los reportes `sales`, `profitability`, `stock-valuation`, `stock-movements`, `purchases`, `receivables-aging`, `collections`, `checks-portfolio` y `supplier-invoices`, con las columnas y filtros de las US-37 a US-45. Los filtros de fecha MUST ser `YYYY-MM-DD` válidos, interpretados como día calendario argentino con extremos inclusivos; un filtro inválido MUST responder 400. Los reportes SHALL tratar los importes como decimales exactos.

#### Scenario: Ventas por período

- **WHEN** se pide `sales` con `from` y `to`
- **THEN** devuelve solo ventas confirmadas dentro del rango con neto, IVA, total y estado de facturación

#### Scenario: Filtro inválido

- **WHEN** se pide un reporte con `from=2026-13-40`
- **THEN** responde 400 y no ejecuta la consulta

### Requirement: Totales al pie

Los reportes `sales`, `profitability`, `stock-valuation`, `collections` y `receivables-aging` SHALL terminar con una fila `TOTAL` que sume sus columnas de importe sin errores de redondeo.

#### Scenario: Valorización total

- **WHEN** se genera `stock-valuation`
- **THEN** la última fila suma la valorización de todos los productos listados

### Requirement: Exportación y pantalla

Cada reporte SHALL poder verse en tabla en `/reports/:type` con sus filtros y descargarse en Excel y PDF con las mismas columnas mostradas.

#### Scenario: Descarga

- **WHEN** el administrador pulsa Excel con filtros aplicados
- **THEN** se descarga un archivo con los mismos filtros y columnas de la vista
