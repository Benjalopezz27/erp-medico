# Spec Delta

## Purpose

Emitir el recibo formal de cada cobro y permitir consultarlo e imprimirlo.

## ADDED Requirements

### Requirement: Emisión y numeración de recibo

Cada cobro registrado SHALL generar exactamente un recibo con número `0001-NNNNNNNN` (8 dígitos, correlativo, sin saltos ni duplicados aun con cobros concurrentes). Un cobro fallido MUST NOT consumir número.

#### Scenario: Numeración correlativa

- **WHEN** se registran dos cobros consecutivos
- **THEN** sus recibos tienen números consecutivos, por ejemplo `0001-00000001` y `0001-00000002`

#### Scenario: Cobro revertido por error

- **WHEN** la transacción del cobro falla
- **THEN** el siguiente cobro exitoso recibe el número que habría correspondido al fallido

### Requirement: Consulta de recibo

El sistema SHALL exponer `GET /receipts/:id` (ADMINISTRADOR y VENDEDOR) con número, fecha, cliente, medio de pago, comprobantes aplicados (referencia, fecha, monto original, monto aplicado) y total cobrado. Responde 404 si no existe y 401 sin token.

#### Scenario: Recibo con dos facturas

- **WHEN** se consulta el recibo de un cobro aplicado a dos facturas
- **THEN** la respuesta lista ambas con su monto original y aplicado y el total cobrado es la suma

### Requirement: Recibo en PDF

El sistema SHALL exponer `GET /receipts/:id/pdf` con `Content-Type: application/pdf` y `Content-Disposition` con el número de recibo. El PDF MUST ser A4 y contener número, fecha, datos del cliente, comprobantes aplicados, medio de pago, total en números y en letras, y línea de firma.

#### Scenario: Descarga

- **WHEN** se pide el PDF de un recibo existente
- **THEN** la respuesta es 200 con bytes que empiezan con `%PDF`

#### Scenario: Recibo inexistente

- **WHEN** el id no existe
- **THEN** la respuesta es 404

### Requirement: Vista e impresión en frontend

El frontend SHALL ofrecer `/receipts/:id` con la vista del recibo y acciones Imprimir y Exportar PDF.

#### Scenario: Exportar

- **WHEN** el usuario pulsa "Exportar PDF"
- **THEN** el navegador descarga el PDF del recibo
