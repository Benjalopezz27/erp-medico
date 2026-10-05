## Purpose

Define que todo elemento que parece interactivo cumpla su función y que cada pantalla secundaria ofrezca una forma consistente de volver.

## ADDED Requirements

### Requirement: Tarjetas de KPI clickeables

Cada tarjeta de KPI del dashboard SHALL ser un enlace completo a su módulo, accesible por mouse y teclado, con efecto hover y foco visibles.

#### Scenario: Click en cualquier parte de la tarjeta

- **WHEN** el administrador hace click en el valor o en el título de la tarjeta "Bajo mínimo"
- **THEN** navega a Stock

#### Scenario: Teclado

- **WHEN** el usuario enfoca una tarjeta y presiona Enter
- **THEN** navega a su módulo

### Requirement: Filas de tabla con destino

Las filas de tablas cuya entidad tiene pantalla de detalle SHALL navegar a esa pantalla al hacer click en cualquier parte de la fila, mostrar cursor de puntero y efecto hover, y ser operables con teclado (foco y Enter). Los destinos son: cliente y deudor a `/customers/$id`, orden de compra a su detalle, alerta fiscal a `/sales/$id`, producto a su edición, stock a los movimientos del producto y proveedor a su catálogo. Un click en un botón, enlace o campo dentro de la fila MUST NOT disparar la navegación de la fila.

#### Scenario: Click en la fila

- **WHEN** el usuario hace click en una celda cualquiera de la fila de un cliente
- **THEN** navega al detalle de ese cliente

#### Scenario: Botón interno

- **WHEN** el usuario hace click en el botón "Editar" dentro de la fila de un proveedor
- **THEN** se ejecuta la acción del botón y no se navega al catálogo

#### Scenario: Teclado

- **WHEN** el usuario enfoca una fila clickeable y presiona Enter
- **THEN** navega al destino de la fila

### Requirement: Sin apariencia falsa de click

Las filas de tablas cuya entidad no tiene pantalla de detalle (usuarios, categorías, unidades, cuarentena, revisión de precios, movimientos de tesorería, cheques y reportes) MUST NOT mostrar cursor de puntero ni efecto de fila clickeable.

#### Scenario: Tabla sin detalle

- **WHEN** el usuario pasa el mouse por una fila de usuarios
- **THEN** no aparece cursor de puntero

### Requirement: Volver consistente

Toda pantalla secundaria (detalle, formulario, subpantalla) SHALL ofrecer un enlace "Volver a …" con flecha y estilo uniforme. Si existe historial de navegación dentro de la aplicación, volver MUST regresar a la ubicación anterior restaurando filtros, orden y página; si no existe (acceso directo por URL), MUST ir a un destino de respaldo explícito de la pantalla.

#### Scenario: Volver con historial

- **WHEN** el usuario filtra ventas, abre una venta y presiona "Volver al historial"
- **THEN** regresa al listado con los mismos filtros y página

#### Scenario: Acceso directo

- **WHEN** el usuario abre `/sales/$id` por URL directa y presiona volver
- **THEN** navega a `/sales`

### Requirement: Pantallas con retorno faltante

Revisión de precios (a Productos), Cuentas corrientes (a Clientes), Caja y Cheques (a Tesorería), Reporte (a Reportes) y Punto de venta (a Ventas) SHALL mostrar su enlace "Volver a …".

#### Scenario: Revisión de precios

- **WHEN** el administrador abre Revisión de precios
- **THEN** ve "Volver a Productos" y al usarlo regresa a Productos

#### Scenario: Cuentas corrientes

- **WHEN** el usuario abre Cuentas corrientes
- **THEN** ve "Volver a Clientes"
