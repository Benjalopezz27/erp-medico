## Purpose

Define la estructura de navegación de la aplicación: sidebar fijo y colapsable con secciones planas, usuario y cierre de sesión en el sidebar, y acceso a pantallas secundarias desde su pantalla padre.

## ADDED Requirements

### Requirement: Sidebar fijo a alto completo

El sidebar MUST ocupar todo el alto de la ventana y permanecer fijo al hacer scroll; solo el área de contenido principal MUST desplazarse.

#### Scenario: Scroll del contenido

- **WHEN** el usuario hace scroll en una pantalla larga
- **THEN** el sidebar permanece visible y quieto

### Requirement: Marca y pie sin versión

El sidebar MUST mostrar la marca "Distribuidora Médica" y MUST NOT mostrar el texto "Sprint 0 • v0.1.0".

#### Scenario: Cabecera del sidebar

- **WHEN** se renderiza el sidebar
- **THEN** muestra "Distribuidora Médica" y no muestra "ERP Médica" ni "Sprint 0"

### Requirement: Sidebar colapsable

El sidebar MUST ofrecer un botón para colapsarlo. Colapsado MUST mostrar solo íconos (ancho 72px) con tooltip del nombre, y los contadores MUST mostrarse como un punto. Expandido MUST medir 256px. El cambio de ancho MUST ser animado y el estado MUST persistir entre sesiones del navegador.

#### Scenario: Colapsar

- **WHEN** el usuario presiona el botón de colapsar
- **THEN** el sidebar pasa a 72px mostrando solo íconos, con transición animada

#### Scenario: Tooltip y badge colapsados

- **WHEN** el sidebar está colapsado y un ítem tiene contador pendiente
- **THEN** el ítem muestra un punto indicador y expone su nombre por tooltip y etiqueta accesible

#### Scenario: Persistencia

- **WHEN** el usuario colapsa el sidebar y recarga la página
- **THEN** el sidebar sigue colapsado

#### Scenario: Mobile

- **WHEN** el ancho de pantalla es menor al breakpoint `lg`
- **THEN** el sidebar funciona como drawer abierto desde el topbar y siempre expandido

### Requirement: Navegación plana por secciones

El sidebar MUST listar todos los ítems visibles sin requerir expandir grupos, agrupados bajo etiquetas de sección: Plataforma (Inicio, Ventas, Productos, Stock, Clientes), Abastecimiento (Compras, Proveedores), Finanzas (Tesorería, Reportes) y Administración (Usuarios, Alertas fiscales, Configuración). Los ítems de uso diario (Ventas, Productos, Stock) MUST aparecer primero.

#### Scenario: Todo visible

- **WHEN** un administrador abre la aplicación
- **THEN** ve los 12 ítems sin expandir ningún grupo

#### Scenario: Permisos

- **WHEN** un usuario no administrador abre la aplicación
- **THEN** el sidebar omite los ítems cuya ruta no permite `isRouteAllowed` y omite las secciones que queden vacías

#### Scenario: Ítem activo

- **WHEN** la ruta actual pertenece a un ítem (incluidas sus subrutas)
- **THEN** ese ítem se muestra resaltado

### Requirement: Usuario y cierre de sesión en el sidebar

El sidebar MUST mostrar al pie un avatar con iniciales, nombre, email, rol y un botón de cerrar sesión. El topbar MUST NOT mostrar usuario ni botón de cerrar sesión.

#### Scenario: Cerrar sesión

- **WHEN** el usuario presiona cerrar sesión en el sidebar
- **THEN** se termina la sesión con el mismo flujo que usaba el topbar

#### Scenario: Sidebar colapsado

- **WHEN** el sidebar está colapsado
- **THEN** el pie muestra el avatar y el botón de cerrar sesión con tooltip

### Requirement: Pantallas unificadas

Las pantallas secundarias MUST ser accesibles desde su pantalla padre y MUST NOT figurar como ítems del sidebar: Revisión de precios desde Productos (solo administrador, con el contador de pendientes), Importador desde Proveedores, Caja y Cheques como tabs de navegación dentro de Tesorería, Cuenta corriente desde Clientes y Cuarentena desde Stock. Las rutas existentes MUST seguir funcionando.

#### Scenario: Revisión de precios desde Productos

- **WHEN** un administrador abre Productos y hay revisiones pendientes
- **THEN** el botón de revisión de precios muestra el contador y navega a `/prices/review`

#### Scenario: Tabs de Tesorería

- **WHEN** el usuario está en Tesorería, Caja o Cheques
- **THEN** ve las tres tabs, la actual marcada, y puede cambiar entre ellas

#### Scenario: Accesos desde pantalla padre

- **WHEN** el usuario abre Proveedores, Clientes o Stock
- **THEN** encuentra respectivamente los accesos a Importador, Cuenta corriente y Cuarentena

#### Scenario: Ruta directa

- **WHEN** el usuario abre `/receivables` o `/importer` por URL
- **THEN** la pantalla carga y el ítem padre del sidebar queda resaltado como activo

### Requirement: Topbar simplificado

El topbar MUST conservar el botón de menú (mobile) y el breadcrumb.

#### Scenario: Topbar

- **WHEN** se renderiza el topbar
- **THEN** muestra breadcrumb y, en mobile, el botón de menú
