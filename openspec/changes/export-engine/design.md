# Design

## Context

- `ReportsModule` es un stub (`GET /reports/status`). `exceljs` y `pdf-lib` ya están instalados; `ReceiptPdfService` y `AccountStatementPdfService` son el patrón pdf-lib (síncrono, A4, helper `safe` para WinAnsi).
- Guards existentes: `JwtAuthGuard`, `RolesGuard` y `@Roles(UserRole.ADMINISTRADOR)` (ver `checks.controller.ts`).
- Montos como `string` decimal por política; el exportador no los opera.

## Goals / Non-Goals

**Goals**

- Un único punto de generación de archivos y de descarga, reutilizable por US-37 a US-45.
- Agregar un reporte = una clase `ReportDefinition` registrada; sin tocar controller ni exportador.

**Non-Goals**

- PDF desde HTML, estilos avanzados, reportes concretos.

## Decisions

1. **exceljs + pdf-lib en vez de SheetJS + Puppeteer.** Ya instaladas; AGENTS.md prohíbe sumar dependencias sin aprobación (aprobado "recomendado"). PDF tabular alcanza para listados. Alternativa Puppeteer descartada: Chromium en Docker y mayor superficie.
2. **`ReportColumn { key, header, type?: 'text'|'money'|'number'|'date'; width? }`** y `rows: Record<string, string|number|null>[]`. `type` decide formato en Excel (numFmt) y alineación a derecha en PDF.
3. **Registro por inyección.** Token `REPORT_DEFINITIONS` (array vía factory en `ReportsModule`); cada reporte nuevo se suma a `providers` y a `inject` de la factory. Se prefirió sobre un switch central: el controller y el exportador no cambian.
4. **`format=json`** devuelve `{ title, columns, rows }` para la vista previa; así preview y export usan la misma consulta.
5. **Filtros** llegan como query params crudos; cada definición los valida con su propio DTO y lanza 400.

## Risks / Trade-offs

- PDF con muchas columnas se comprime: A4 horizontal y truncado de celda con "…" (ceiling documentado; subir a otra orientación si hace falta).
- Sin streaming: reportes grandes se generan en memoria. Aceptable para volumen de puesto único.
