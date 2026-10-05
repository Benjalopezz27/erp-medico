# Spec Delta

## Purpose

Proveer generación centralizada de Excel y PDF y un endpoint genérico para todos los reportes operativos.

## ADDED Requirements

### Requirement: Exportación a Excel

`ExportService.toExcel(title, columns, rows)` SHALL devolver un `Buffer` XLSX con una hoja titulada, fila de encabezados según `columns` y una fila por elemento de `rows`. Los montos MUST escribirse como número con formato de 2 decimales sin pasar por aritmética de punto flotante en el servicio.

#### Scenario: Excel con datos

- **WHEN** se exporta un reporte con 3 columnas y 2 filas
- **THEN** el archivo tiene 1 fila de encabezado y 2 filas de datos con los valores en el orden de las columnas

#### Scenario: Excel sin filas

- **WHEN** `rows` está vacío
- **THEN** el archivo contiene solo los encabezados y no falla

### Requirement: Exportación a PDF

`ExportService.toPdf(title, columns, rows)` SHALL devolver un `Buffer` PDF A4 horizontal con título, encabezados repetidos en cada página y paginación automática. El texto no codificable MUST reemplazarse sin lanzar error.

#### Scenario: PDF multipágina

- **WHEN** se exportan más filas de las que entran en una página
- **THEN** el PDF tiene varias páginas y cada una repite los encabezados

### Requirement: Endpoint genérico de reportes

El sistema SHALL exponer `GET /reports/:type?format=json|excel|pdf` accesible solo a ADMINISTRADOR. `format` por defecto es `json`. Un `type` no registrado MUST responder 404 y un `format` inválido 400. Excel y PDF SHALL responder con el `Content-Type` correcto y `Content-Disposition: attachment` con nombre `<type>-<fecha>.<ext>`.

#### Scenario: Descarga Excel

- **WHEN** un ADMINISTRADOR pide `/reports/sales?format=excel`
- **THEN** recibe un XLSX como adjunto

#### Scenario: Reporte inexistente

- **WHEN** se pide `/reports/inexistente`
- **THEN** responde 404

#### Scenario: Rol no autorizado

- **WHEN** un VENDEDOR pide cualquier reporte
- **THEN** responde 403
