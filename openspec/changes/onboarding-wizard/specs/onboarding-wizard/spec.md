## ADDED Requirements

### Requirement: Progreso calculado

El sistema SHALL calcular el estado de cada paso con consultas de existencia sobre los datos del módulo (fiscal: razón social, CUIT, condición y punto de venta definidos; usuarios: al menos un administrador activo; categorías y unidades: al menos una de cada; productos, clientes o proveedores, tesorería y stock: al menos un registro). MUST NOT persistir el estado de los pasos.

#### Scenario: Dato cargado fuera de la guía

- **WHEN** se crea una categoría y una unidad desde Configuración
- **THEN** el paso "Categorías y unidades" figura hecho sin ninguna acción en la guía

### Requirement: Consulta de estado

`GET /config/onboarding-status` SHALL devolver cada paso con `done`, `dismissed` del bloque y los ids de carteles descartados. Solo rol administrador.

#### Scenario: Sistema nuevo

- **WHEN** un administrador consulta con la base recién creada
- **THEN** los pasos pendientes figuran `done: false` y `dismissed` es `false`

### Requirement: Bloque Primeros pasos no bloqueante

El Inicio SHALL mostrar a los administradores el bloque con el estado de cada paso y un enlace a la pantalla del módulo. El bloque MUST NOT impedir ni redirigir ninguna navegación ni operación.

#### Scenario: Operar con pasos pendientes

- **WHEN** quedan pasos pendientes
- **THEN** ventas, stock y facturación funcionan con normalidad

### Requirement: Descarte persistente del bloque

El sistema SHALL permitir descartar el bloque (`POST /config/onboarding/dismiss`), persistiendo `onboarding_dismissed` en `system_settings`. Una vez descartado MUST NOT volver a mostrarse. Si todos los pasos están hechos el bloque MUST ocultarse sin acción del usuario.

#### Scenario: Descartar

- **WHEN** el administrador descarta el bloque y recarga desde otro equipo
- **THEN** el bloque no aparece

#### Scenario: Todo hecho

- **WHEN** los siete pasos están hechos
- **THEN** el bloque no se muestra

### Requirement: Carteles contextuales

Productos, Compras y Ventas SHALL mostrar a administradores un cartel explicativo una sola vez por pantalla. Descartarlo (`POST /config/hints/:id/dismiss`) persiste `hint_dismissed_<id>` en `system_settings` y MUST impedir que reaparezca. Un id desconocido MUST rechazarse con 400.

#### Scenario: Cartel descartado

- **WHEN** el administrador descarta el cartel de Productos
- **THEN** no reaparece al volver a la pantalla ni en otro equipo, y los de Compras y Ventas siguen visibles

### Requirement: Certificado ARCA solo verificado

El paso fiscal SHALL mostrar solo si el certificado del entorno está configurado y MUST NOT recibir, almacenar ni registrar en logs el `.p12` ni su password.

#### Scenario: Cert no configurado

- **WHEN** el entorno no define certificado
- **THEN** el paso informa que se configura en el servidor
