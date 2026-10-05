# Design

## Context

`ExportService` y el endpoint genérico `GET /reports/:type` reciben una lista `REPORT_DEFINITIONS` de `{ type, generate(filters) }`. El esquema ya tiene todas las tablas necesarias (`sales`, `sale_items`, `stocks`, `stock_movements`, `purchase_orders`, `account_receivables`, `payments`, `checks`, `supplier_invoices`).

## Goals / Non-Goals

**Goals**: nueve reportes de solo lectura con el mínimo de código; una pantalla genérica.
**Non-Goals**: reportes sin US, gráficos, envío por correo.

## Decisions

1. **Reporte = spec declarativa** `{ type, title, columns, totals?, build(filters) → { sql, params } }` y una función `createSqlReport(dataSource, spec)`. Evita nueve clases y providers; el módulo mapea las specs con `DataSource`.
2. **SQL crudo con parámetros** (`$n`), nunca interpolación de filtros. `WhereBuilder` agrega cláusulas con su parámetro y valida fechas y enums (400 si son inválidos).
3. **Fechas** como día calendario argentino (`AT TIME ZONE 'America/Argentina/Buenos_Aires'`), igual que tesorería; las columnas `date` se comparan directo.
4. **Importes en SQL**: `numeric` exacto; la fila de totales suma en `decimal.js` en el servicio.
5. **Fechas de salida** formateadas en SQL (`to_char`, `DD/MM/YYYY`) para no depender de la conversión de `Date` del driver.
6. **Frontend genérico**: un arreglo `REPORT_CONFIGS` (título, filtros, columnas con tipo) alimenta `/reports/$type`; los selects de cliente, proveedor, categoría y producto reutilizan las consultas existentes.

## Risks / Trade-offs

- Rentabilidad usa el costo actual (`products.cost_net`), no el de la fecha de venta: si el costo cambió, el margen histórico se desvía. Declarado; un snapshot de costo en `sale_items` sería otro change.
- Sin paginación: se asume volumen de un puesto único; un tope de filas (ponytail) queda como mejora si un reporte crece.
- Cada consulta se prueba contra la base local con un script; no hay base en CI, por lo que los specs prueban el armado de SQL y parámetros.
