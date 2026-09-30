# Spec Delta

## Purpose

Permitir a Administradores y Vendedores descargar el PDF y visualizar el QR de un comprobante
fiscal emitido desde el detalle de la venta y desde el historial de devoluciones, sin exponer
binarios en el JSON de la venta ni URLs públicas con datos fiscales.

## ADDED Requirements

### Requirement: Descarga autenticada del PDF fiscal

El sistema SHALL exponer `GET /sales/:id/fiscal-document/pdf` que transmite el PDF en streaming
con `Content-Type: application/pdf` y `Content-Disposition` con nombre derivado de tipo y número
sanitizados, únicamente cuando el artefacto está disponible.

#### Scenario: PDF disponible

- **WHEN** un usuario ADMINISTRADOR o VENDEDOR solicita el PDF de un `FiscalDocument` con
  `arcaStatus: EMITIDO` y artefacto `DISPONIBLE`
- **THEN** el sistema responde 200 con el PDF en streaming y un nombre de archivo derivado del
  tipo y número del comprobante

#### Scenario: Artefacto aún no disponible

- **WHEN** se solicita el PDF de un `FiscalDocument` `EMITIDO` cuyo artefacto sigue en
  `PENDIENTE`/`GENERANDO`, o de un documento sin CAE
- **THEN** el sistema responde 409 indicando el estado transitorio, sin afirmar un error fiscal

#### Scenario: Documento inexistente

- **WHEN** se solicita el PDF de una venta sin `FiscalDocument`
- **THEN** el sistema responde 404

### Requirement: Consulta autenticada del QR fiscal

El sistema SHALL exponer `GET /sales/:id/fiscal-document/qr` que devuelve la imagen del QR
oficial codificando el payload persistido, sin depender de una URL externa que exponga datos
adicionales.

#### Scenario: QR disponible

- **WHEN** un usuario ADMINISTRADOR o VENDEDOR solicita el QR de un `FiscalDocument` `EMITIDO` con
  `qrCodeData` persistido
- **THEN** el sistema responde 200 con una imagen PNG que decodifica al payload oficial esperado

### Requirement: Autorización por rol en endpoints de artefacto

El sistema SHALL requerir sesión autenticada con rol ADMINISTRADOR o VENDEDOR para ambos
endpoints, y NUNCA SHALL exponerlos sin autenticación ni mediante URLs públicas.

#### Scenario: Sin token

- **WHEN** se solicita el PDF o el QR sin un token JWT válido
- **THEN** el sistema responde 401

#### Scenario: Rol no autorizado

- **WHEN** un usuario autenticado con un rol distinto de ADMINISTRADOR o VENDEDOR solicita el PDF
  o el QR
- **THEN** el sistema responde 403

### Requirement: Disponibilidad del artefacto en el contrato de detalle fiscal

El sistema SHALL extender el contrato de detalle fiscal de la venta con el estado de
disponibilidad del artefacto (pendiente, generando, disponible, error), tamaño y fecha de
generación, sin transferir el binario del PDF ni el payload QR crudo dentro del JSON de la venta.

#### Scenario: Detalle de venta con artefacto disponible

- **WHEN** se consulta el detalle de una venta cuyo `FiscalDocument` tiene el PDF `DISPONIBLE`
- **THEN** la respuesta incluye el estado del artefacto, tamaño y fecha de generación, sin incluir
  el binario ni el payload QR

### Requirement: Sección "Comprobante Fiscal" en el detalle de venta

El sistema SHALL mostrar en `/sales/:id` el tipo/número formateado, estado, CAE y vencimiento del
comprobante, con acciones "Descargar PDF" y "Ver QR" disponibles únicamente cuando el artefacto
está disponible, y SHALL comunicar el estado transitorio sin afirmar un error fiscal mientras el
artefacto no está listo.

#### Scenario: Comprobante emitido con artefacto disponible

- **WHEN** un Administrador o Vendedor abre el detalle de una venta con `FiscalDocument` `EMITIDO`
  y artefacto `DISPONIBLE`
- **THEN** la pantalla muestra tipo/número, CAE, vencimiento y habilita "Descargar PDF" y "Ver QR"

#### Scenario: Emitido sin artefacto todavía

- **WHEN** el `FiscalDocument` está `EMITIDO` pero el artefacto sigue `PENDIENTE`/`GENERANDO`
- **THEN** la pantalla indica que el documento se está generando y no ofrece descarga ni QR

#### Scenario: Error recuperable de artefacto

- **WHEN** el artefacto de un `FiscalDocument` `EMITIDO` está en `ERROR`
- **THEN** la pantalla ofrece reintentar la generación documental sin indicar una falla del CAE

### Requirement: Acceso documental de la Nota de Crédito en devoluciones

El sistema SHALL habilitar en el historial de devoluciones el acceso al PDF/QR de la Nota de
Crédito únicamente cuando su `FiscalDocument` esté `EMITIDO` con artefacto disponible.

#### Scenario: Nota de Crédito emitida con artefacto disponible

- **WHEN** una devolución tiene una Nota de Crédito con `FiscalDocument` `EMITIDO` y artefacto
  `DISPONIBLE`
- **THEN** el historial de devoluciones muestra la acción de descarga/QR de esa Nota de Crédito

#### Scenario: Nota de Crédito sin artefacto todavía

- **WHEN** la Nota de Crédito de una devolución aún no tiene artefacto disponible
- **THEN** el historial de devoluciones no ofrece la acción de descarga/QR para esa fila

## MODIFIED Requirements

### Requirement: Consulta autenticada del documento fiscal de una venta

El sistema SHALL exponer `GET /sales/:id/fiscal-document` devolviendo el estado (`EMITIDO`,
`PENDIENTE_FACTURACION`, `RECHAZADO`), tipo de comprobante, punto de venta, número, CAE,
vencimiento, y además el estado de disponibilidad del artefacto documental (`PENDIENTE`,
`GENERANDO`, `DISPONIBLE`, `ERROR`), su tamaño y fecha de generación cuando corresponda.

#### Scenario: Comprobante emitido con artefacto disponible

- **WHEN** un usuario ADMINISTRADOR o VENDEDOR consulta una venta cuyo `FiscalDocument` está
  `EMITIDO` y su artefacto `DISPONIBLE`
- **THEN** el sistema responde 200 con tipo, punto de venta, número, CAE, vencimiento y el estado
  de disponibilidad del artefacto

#### Scenario: Comprobante emitido sin artefacto todavía

- **WHEN** el `FiscalDocument` está `EMITIDO` pero el artefacto sigue `PENDIENTE`/`GENERANDO`
- **THEN** el sistema responde 200 con los datos fiscales y el estado de artefacto
  correspondiente, sin incluir binario
