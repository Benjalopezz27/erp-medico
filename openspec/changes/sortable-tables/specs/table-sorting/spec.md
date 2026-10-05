## Purpose

Define el ordenamiento por columna en las tablas de listado de la aplicación: cómo se opera desde la UI, cómo viaja en la URL y la API, y qué garantías de orden y validación se ofrecen.

## ADDED Requirements

### Requirement: Encabezados ordenables

Cada columna de datos ordenable de una tabla de listado SHALL mostrar en su encabezado un control accesible por mouse y teclado que alterne el orden en el ciclo ascendente, descendente y orden por defecto. La columna ordenada MUST indicar su dirección visualmente y mediante `aria-sort`. Las columnas de acciones MUST NOT ser ordenables.

#### Scenario: Orden ascendente

- **WHEN** el usuario hace click en el encabezado "Nombre" sin orden activo
- **THEN** la tabla se ordena por nombre ascendente y el encabezado indica ascendente

#### Scenario: Orden descendente

- **WHEN** el usuario hace click de nuevo en la misma columna
- **THEN** la tabla se ordena descendente

#### Scenario: Volver al orden por defecto

- **WHEN** el usuario hace click por tercera vez
- **THEN** se quita el orden y la tabla vuelve a su orden por defecto

#### Scenario: Cambiar de columna

- **WHEN** hay un orden activo y el usuario hace click en otra columna
- **THEN** la nueva columna se ordena ascendente y la anterior pierde el indicador

#### Scenario: Teclado

- **WHEN** el usuario enfoca un encabezado ordenable y presiona Enter o Espacio
- **THEN** se aplica el mismo ciclo de orden

### Requirement: Orden en el servidor para tablas paginadas

Las tablas paginadas MUST ordenar todo el conjunto de resultados mediante los parámetros `sortBy` y `sortOrder` (`ASC` o `DESC`), y el orden MUST reflejarse en la URL de la pantalla para sobrevivir a recargas y a la navegación hacia el detalle y de vuelta. Un cambio de orden MUST volver a la página 1 y conservar los filtros activos.

#### Scenario: Orden global

- **WHEN** el usuario ordena ventas por total descendente estando en la página 2
- **THEN** la tabla muestra la página 1 del conjunto completo ordenado por total descendente

#### Scenario: Orden en la URL

- **WHEN** hay un orden activo y el usuario recarga la página
- **THEN** la tabla conserva el mismo orden y el mismo indicador

#### Scenario: Filtros conservados

- **WHEN** el usuario tiene un filtro de búsqueda y cambia el orden
- **THEN** el filtro se mantiene

### Requirement: Orden en el cliente para tablas completas

Las tablas cuyos datos se cargan completos (categorías, unidades y reportes) MUST ordenarse en el navegador. Los valores numéricos y monetarios MUST ordenarse por valor y no alfabéticamente. En reportes, la fila de totales MUST permanecer siempre al final.

#### Scenario: Numérico

- **WHEN** el usuario ordena una columna monetaria de un reporte ascendente
- **THEN** `9,00` aparece antes que `10,00`

#### Scenario: Fila de totales

- **WHEN** el usuario ordena un reporte por cualquier columna y dirección
- **THEN** la fila `TOTAL` sigue al final

### Requirement: Validación y compatibilidad en la API

Cada endpoint de listado MUST aceptar únicamente columnas de una lista blanca para `sortBy` y los valores `ASC` o `DESC` (sin distinguir mayúsculas) para `sortOrder`; un valor fuera de la lista MUST responder 400. Sin parámetros de orden, MUST mantener el orden por defecto actual. El orden MUST ser determinista, usando el identificador como desempate.

#### Scenario: Columna inválida

- **WHEN** se consulta `GET /sales?sortBy=password`
- **THEN** responde 400

#### Scenario: Sin parámetros

- **WHEN** se consulta un listado sin `sortBy`
- **THEN** devuelve el mismo orden que antes de este cambio

#### Scenario: Orden estable

- **WHEN** varias filas tienen el mismo valor en la columna ordenada
- **THEN** su orden relativo es siempre el mismo entre páginas, sin repetir ni omitir filas

### Requirement: Columnas derivadas

Las columnas calculadas (stock actual, estado de stock, saldo total y antigüedad de deuda) MUST ordenarse según el mismo valor que se muestra al usuario.

#### Scenario: Stock actual

- **WHEN** el usuario ordena el control de stock por "Stock Actual" ascendente
- **THEN** los productos aparecen del menor al mayor stock mostrado

#### Scenario: Saldo total

- **WHEN** el usuario ordena cuentas corrientes por "Saldo total" descendente
- **THEN** el cliente con mayor deuda aparece primero
