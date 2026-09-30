## Purpose

Da al frontend una capa transversal y reutilizable para mostrar errores y estados de carga/vacío al
usuario, evitando que cada pantalla reinvente su propio manejo y evitando que un error inesperado
deje la aplicación completa en blanco.

## ADDED Requirements

### Requirement: Aislamiento de errores de render

Un error no controlado durante el render de una parte de la interfaz SHALL quedar contenido a esa
parte de la interfaz, sin dejar la aplicación completa inutilizable, y SHALL ofrecer al usuario una
forma de recuperarse (recargar esa sección o la página).

#### Scenario: Falla de render en una pantalla

- **WHEN** un componente de una pantalla lanza una excepción durante el render
- **THEN** el usuario ve un mensaje de error contenido en esa sección, con una acción para
  recargar, y el resto de la aplicación (navegación, otras secciones) sigue funcionando

### Requirement: Notificación centralizada de errores no manejados

Todo error de una petición al API que no sea manejado explícitamente por la pantalla que lo originó
SHALL disparar una notificación visible (toast) con un mensaje legible derivado del contrato de
error de la API.

#### Scenario: Error de red o servidor sin manejo explícito en la pantalla

- **WHEN** una query o mutation falla y el componente que la invoca no define su propio manejo de
  error
- **THEN** el usuario ve una notificación con el mensaje de error correspondiente, sin necesidad de
  que la pantalla implemente ese manejo por su cuenta

### Requirement: Interpretación única de errores de API

El frontend SHALL usar una única función de interpretación de errores de API en toda la aplicación,
que traduzca cualquier error de red o de respuesta de la API al contrato de error compartido, en vez
de que cada feature implemente su propia lógica de interpretación.

#### Scenario: Dos features reciben el mismo tipo de error de servidor

- **WHEN** dos pantallas distintas reciben una respuesta de error con el mismo `code`
- **THEN** ambas obtienen el mismo mensaje interpretado y la misma información estructurada, porque
  usan la misma función de interpretación

### Requirement: Estados de carga y vacío consistentes

Las vistas de listado SHALL usar componentes compartidos para representar el estado de carga (mientras
los datos no llegaron) y el estado vacío (cuando la consulta no devuelve resultados), en vez de texto
o marcado ad hoc por pantalla.

#### Scenario: Tabla sin resultados

- **WHEN** una consulta de listado se resuelve sin resultados
- **THEN** la tabla muestra el componente compartido de estado vacío en vez de texto propio de esa
  pantalla

#### Scenario: Tabla cargando datos

- **WHEN** una consulta de listado todavía no resolvió
- **THEN** la tabla muestra el componente compartido de estado de carga en vez de un spinner ad hoc
