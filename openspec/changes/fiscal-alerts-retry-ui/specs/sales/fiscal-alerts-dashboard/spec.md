## Purpose

Dar a un Administrador una bandeja operativa para ver comprobantes fiscales (Facturas y Notas de
Crédito) pendientes o rechazados por ARCA/AFIP, y solicitar un reintento seguro sin operar Redis,
la base de datos ni herramientas externas.

## ADDED Requirements

### Requirement: Acceso restringido a Administrador

El sistema SHALL exponer la ruta `/admin/fiscal-alerts` únicamente para usuarios con rol
`ADMINISTRADOR`. Un usuario sin ese rol que navegue directamente a la URL SHALL ser redirigido y
no SHALL ver el contenido de la bandeja.

#### Scenario: Administrador accede a la bandeja

- **WHEN** un usuario con rol `ADMINISTRADOR` navega a `/admin/fiscal-alerts`
- **THEN** el sistema muestra la bandeja de alertas fiscales

#### Scenario: Vendedor intenta acceder

- **WHEN** un usuario con rol `VENDEDOR` navega directamente a `/admin/fiscal-alerts`
- **THEN** el sistema lo redirige fuera de la ruta y no renderiza la tabla ni sus datos

### Requirement: Listado de comprobantes pendientes y rechazados

El sistema SHALL listar Facturas y Notas de Crédito en estado `PENDIENTE_FACTURACION` o
`RECHAZADO`, mostrando venta o devolución asociada, cliente, fecha, importe, tipo de comprobante,
estado, cantidad de intentos, último intento, próximo retry programado (si existe) y mensaje de
error sanitizado. El sistema SHALL distinguir visual y semánticamente `PENDIENTE_FACTURACION` de
`RECHAZADO`, y ninguno de los dos SHALL confundirse con el estado comercial de la venta
(`Sale.status`).

#### Scenario: Documento pendiente con reintento automático programado

- **WHEN** existe un `FiscalDocument` en `PENDIENTE_FACTURACION` con próxima ejecución
  programada
- **THEN** la fila muestra el estado "Pendiente", la fecha/hora del próximo intento y no ofrece
  la acción "Reintentar" mientras ese intento automático siga vigente

#### Scenario: Documento rechazado definitivo

- **WHEN** existe un `FiscalDocument` en `RECHAZADO`
- **THEN** la fila muestra el estado "Rechazado", el error sanitizado devuelto por el backend y
  la acción disponible que el backend indique como reintentable o no

#### Scenario: Nota de Crédito trazable a su origen

- **WHEN** el documento listado es una Nota de Crédito pendiente o rechazada
- **THEN** la fila permite identificar la devolución y la Factura original relacionadas

### Requirement: Filtros y paginación reflejados en la URL

El sistema SHALL ofrecer un filtro de tipo tabs equivalente para "Pendientes" y "Rechazados", más
filtros por rango de fechas, tipo de comprobante y búsqueda por número de venta o cliente. El
sistema SHALL reflejar tabs, filtros y página actual en los parámetros de la URL y SHALL
preservarlos ante un refresh o una navegación de ida y vuelta.

#### Scenario: Filtros sobreviven a un refresh

- **WHEN** un Administrador aplica un filtro de estado y fecha y luego refresca la página
- **THEN** la bandeja se renderiza con el mismo tab, filtros y página que tenía antes del refresh

### Requirement: Estados de carga, vacío y error de la consulta

El sistema SHALL mostrar estados de carga, vacío y error distinguibles y accesibles al consultar
el listado, y SHALL ofrecer una forma de reintentar la consulta fallida sin recargar la página
completa.

#### Scenario: Error de red al consultar el listado

- **WHEN** la consulta al listado de comprobantes falla por error de red
- **THEN** el sistema muestra un estado de error accesible con una acción para reintentar la
  consulta, sin recargar la aplicación completa

#### Scenario: Sin comprobantes pendientes ni rechazados

- **WHEN** la consulta no devuelve comprobantes pendientes ni rechazados
- **THEN** el sistema muestra un estado vacío accesible

### Requirement: Badge de conteo en la navegación

El sistema SHALL mostrar en la navegación de Administración un badge con el conteo autoritativo
de comprobantes pendientes y rechazados, obtenido del backend. El badge SHALL ocultarse cuando el
conteo es cero y SHALL actualizarse después de una acción que cambie ese conteo (por ejemplo, un
reintento exitoso), sin polling agresivo.

#### Scenario: Conteo en cero

- **WHEN** no existen comprobantes pendientes ni rechazados
- **THEN** el badge de navegación no se muestra

#### Scenario: Conteo se actualiza tras un reintento exitoso

- **WHEN** un reintento manual resulta en la emisión del comprobante
- **THEN** el badge de navegación refleja el conteo actualizado sin requerir un refresh manual de
  la página

### Requirement: Reintento manual con confirmación e idempotencia

El sistema SHALL permitir a un Administrador solicitar el reintento de un comprobante
reintentable mediante un diálogo de confirmación que explique el impacto (se consultará ARCA
primero y la venta seguirá confirmada) y el estado actual del documento. El sistema SHALL
prevenir el doble submit de la misma solicitud de reintento, incluso ante doble click.

#### Scenario: Confirmación requerida antes de reintentar

- **WHEN** un Administrador hace clic en "Reintentar" sobre un documento reintentable
- **THEN** el sistema muestra un diálogo de confirmación con el estado actual del documento antes
  de disparar la mutación

#### Scenario: Doble click no duplica la solicitud

- **WHEN** un Administrador confirma el reintento y hace doble click sobre el botón de
  confirmación
- **THEN** el sistema dispara una única mutación de reintento hacia el backend

#### Scenario: Acción no disponible durante un reintento activo

- **WHEN** un documento ya tiene un job de reintento activo
- **THEN** el sistema no ofrece la acción "Reintentar" para ese documento

### Requirement: Reconciliación de respuestas concurrentes del reintento

El sistema SHALL interpretar las respuestas 404, 409 y 422 del endpoint de reintento como
condiciones accionables y estables (documento inexistente, ya emitido, job activo, rechazo no
reintentable, datos/configuración pendientes), sin afirmar que se creó una nueva emisión cuando
no ocurrió. Ante una respuesta concurrente que indique que el documento ya cambió de estado (por
ejemplo, quedó `EMITIDO` o un job ya está activo), el sistema SHALL cerrar o reconciliar el
diálogo y refrescar el estado autoritativo del documento, la lista y el conteo.

#### Scenario: El documento ya fue emitido concurrentemente

- **WHEN** un Administrador confirma un reintento y el backend responde que el documento ya está
  `EMITIDO`
- **THEN** el sistema reconcilia el diálogo, no informa una nueva emisión y refresca la lista, el
  conteo y el detalle de la venta

#### Scenario: Ya existe un job de reintento encolado

- **WHEN** el backend responde 409 indicando un job de reintento ya activo para ese documento
- **THEN** el sistema informa esa condición de forma accionable y no dispara una segunda mutación

### Requirement: Navegación a la venta relacionada

El sistema SHALL permitir a un Administrador navegar desde una fila de la bandeja al detalle de
la venta correspondiente mediante una acción "Ver detalle".

#### Scenario: Ver detalle de la venta

- **WHEN** un Administrador hace clic en "Ver detalle" sobre una fila
- **THEN** el sistema navega al detalle de la venta correcta asociada a ese comprobante

### Requirement: Sin exposición de datos sensibles

El sistema SHALL NOT mostrar Token/Sign, certificados, XML/SOAP crudo ni datos fiscales
innecesarios en ninguna parte de la bandeja, diálogos o mensajes de error.

#### Scenario: Error sanitizado en la fila

- **WHEN** el backend informa un error de emisión fiscal para un documento rechazado
- **THEN** la bandeja muestra únicamente el mensaje sanitizado provisto por el backend, sin
  fragmentos de XML/SOAP ni secretos
