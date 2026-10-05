# Proposal

## Why

Los reportes operativos de Sprint 10 (US-37 a US-45) deben exportar a Excel y PDF. Sin una infraestructura común, cada reporte reimplementaría generación de archivos, descarga y control de acceso. US-36 (issue #11) crea esa base una sola vez.

## What Changes

- Nuevo `ExportService` en `modules/reports` con `toExcel(title, columns, rows)` y `toPdf(title, columns, rows)`, ambos devuelven `Buffer`.
- Contrato `ReportDefinition` (clave, título, columnas, `generate(filters)`) y registro de reportes por clave.
- Endpoint genérico `GET /reports/:type?format=json|excel|pdf` (solo ADMINISTRADOR) que resuelve la definición, ejecuta `generate` y exporta. `json` alimenta la vista previa del frontend.
- Helper frontend para descargar el archivo desde el endpoint (blob + nombre de archivo).
- Desvío del sprint plan: Excel con `exceljs` y PDF tabular con `pdf-lib` (ya instalados) en lugar de SheetJS y Puppeteer; evita dependencias nuevas y Chromium en la imagen Docker. `toPdf` recibe columnas y filas, no HTML.
- Fuera de alcance: los reportes concretos (US-37 a US-45), PDF con plantillas HTML, gráficos, envío por mail.

## Capabilities

### New Capabilities

- `reports/export-engine`: generación de Excel/PDF y endpoint genérico de reportes.

### Modified Capabilities

(ninguna)

## Impact

- Backend: `apps/backend/src/modules/reports/` (hoy stub `status`): `export.service.ts`, `report.types.ts`, `report-registry.service.ts`, controller con guards.
- Frontend: `features/reports/` con helper de descarga.
- Sin migraciones ni dependencias nuevas. Montos viajan como `string` decimal (`docs/decimal_policy.md`); no se hace aritmética en el exportador.
