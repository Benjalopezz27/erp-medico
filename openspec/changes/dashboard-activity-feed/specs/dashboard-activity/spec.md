## Purpose

Define el feed de actividad reciente del dashboard: qué eventos del dominio muestra, quién ve cada tipo, cómo se presenta y cómo se mantiene actualizado.

## ADDED Requirements

### Requirement: Feed unificado de actividad reciente

El sistema SHALL exponer `GET /dashboard/activity` que devuelva los eventos más recientes del dominio ordenados por fecha descendente, con un límite configurable por parámetro `limit` (por defecto 15, mínimo 1, máximo 50).

#### Scenario: Orden y límite por defecto

- **WHEN** un usuario autenticado consulta `GET /dashboard/activity` sin parámetros
- **THEN** recibe como máximo 15 eventos ordenados del más reciente al más antiguo

#### Scenario: Límite fuera de rango

- **WHEN** se consulta con `limit=0` o `limit=500`
- **THEN** el sistema responde 400 con un mensaje de validación

#### Scenario: Sin actividad

- **WHEN** no existe ningún evento visible para el usuario
- **THEN** responde 200 con una lista vacía

### Requirement: Tipos de evento

El feed SHALL incluir los siguientes tipos de evento: venta confirmada, venta anulada, movimiento de stock, cobro registrado y movimiento de tesorería. Una venta en borrador MUST NOT aparecer.

#### Scenario: Venta confirmada

- **WHEN** se confirma una venta
- **THEN** aparece un evento de tipo venta confirmada con número de venta, cliente (o "Consumidor final" si no tiene), monto total y fecha de creación

#### Scenario: Venta anulada

- **WHEN** una venta pasa a estado anulada
- **THEN** aparece un evento de tipo venta anulada con la fecha de la anulación

#### Scenario: Movimiento de stock

- **WHEN** se registra un movimiento de stock de compra, merma o ajuste
- **THEN** aparece un evento con producto, tipo de movimiento y cantidad base, sin monto

#### Scenario: Cobro

- **WHEN** se registra un cobro con recibo
- **THEN** aparece un evento con número de recibo, cliente y monto

#### Scenario: Movimiento de tesorería

- **WHEN** se registra un movimiento manual, de caja o de cheque
- **THEN** aparece un evento con concepto, tipo de movimiento (ingreso o egreso) y monto

### Requirement: Sin eventos duplicados

El feed MUST NOT mostrar más de un evento por el mismo hecho de negocio. Los movimientos de stock originados por una venta o por una devolución de cliente, y los movimientos de tesorería originados por una venta o por un cobro, MUST excluirse porque ya están representados por el evento de venta o de cobro.

#### Scenario: Una venta, un evento

- **WHEN** se confirma una venta que descuenta stock y genera un movimiento de tesorería
- **THEN** el feed muestra un único evento de venta y ninguno de stock ni de tesorería para esa venta

#### Scenario: Cobro

- **WHEN** se registra un cobro que genera un movimiento de tesorería
- **THEN** el feed muestra un único evento de cobro

### Requirement: Visibilidad por rol

El administrador SHALL ver todos los tipos de evento. El vendedor SHALL ver únicamente eventos de venta (confirmada y anulada) y de movimiento de stock. Los eventos de cobros y de tesorería MUST NOT enviarse a un vendedor. Una solicitud sin autenticación MUST responder 401.

#### Scenario: Administrador

- **WHEN** un administrador consulta el feed
- **THEN** recibe ventas, stock, cobros y tesorería

#### Scenario: Vendedor

- **WHEN** un vendedor consulta el feed
- **THEN** recibe solo ventas y stock, aunque existan cobros y movimientos de tesorería más recientes

#### Scenario: Sin sesión

- **WHEN** se consulta sin token válido
- **THEN** responde 401

### Requirement: Contenido de cada evento

Cada evento SHALL incluir identificador, tipo, título, detalle, fecha en formato ISO 8601, nombre del usuario que lo originó (nulo si no aplica), un destino de navegación y, cuando corresponda, un monto. El monto MUST serializarse como string decimal con dos decimales y MUST NOT calcularse con números de punto flotante.

#### Scenario: Monto decimal

- **WHEN** un evento tiene monto
- **THEN** el valor es un string decimal con dos decimales, p. ej. `"16988.40"`

#### Scenario: Evento sin monto

- **WHEN** el evento es un movimiento de stock
- **THEN** el campo monto es nulo

#### Scenario: Destino de navegación

- **WHEN** el evento es una venta, un movimiento de stock, un cobro o un movimiento de tesorería
- **THEN** su destino apunta respectivamente al detalle de la venta, al detalle de stock del producto, al recibo y a la pantalla de tesorería

### Requirement: Presentación en el dashboard

El dashboard SHALL mostrar el feed en la card "Actividad reciente", con estado de carga, estado vacío ("No hay actividad reciente") y estado de error con opción de reintentar. Cada evento MUST ser un enlace a su destino y mostrar la hora relativa o la fecha.

#### Scenario: Carga

- **WHEN** el feed aún no respondió
- **THEN** la card muestra un indicador de carga y no el estado vacío

#### Scenario: Vacío

- **WHEN** el feed responde sin eventos
- **THEN** la card muestra "No hay actividad reciente"

#### Scenario: Error

- **WHEN** la consulta falla
- **THEN** la card muestra el error y un botón para reintentar

#### Scenario: Navegar a un evento

- **WHEN** el usuario hace click en un evento de venta
- **THEN** navega al detalle de esa venta

### Requirement: Paginación del feed

El dashboard SHALL mostrar 5 eventos por página y ofrecer navegación "Anterior" y "Siguiente" con el indicador "Página X de Y" cuando haya más de 5 eventos. Se pagina sobre los últimos 50 eventos que devuelve el sistema.

#### Scenario: Primera página

- **WHEN** hay 12 eventos
- **THEN** se muestran 5, el indicador dice "Página 1 de 3" y "Anterior" está deshabilitado

#### Scenario: Última página

- **WHEN** el usuario llega a la última página
- **THEN** se muestran los eventos restantes y "Siguiente" está deshabilitado

#### Scenario: Pocos eventos

- **WHEN** hay 5 eventos o menos
- **THEN** no se muestra la paginación

### Requirement: Actualización automática

El feed SHALL mantenerse actualizado sin recargar la página: al volver el foco a la pestaña, por consulta periódica cada 30 segundos mientras la pestaña esté visible, e inmediatamente después de completar una operación que genere actividad (venta, devolución, cobro, movimiento de tesorería o de caja, operación de cheque o ajuste/cuarentena de stock). Esas operaciones SHALL refrescar también los KPI del dashboard.

#### Scenario: Tras crear una venta

- **WHEN** el usuario confirma una venta y vuelve al dashboard
- **THEN** la venta aparece en el feed sin recargar manualmente y los KPI reflejan el nuevo total

#### Scenario: Foco de pestaña

- **WHEN** el usuario vuelve a la pestaña del dashboard después de otra actividad
- **THEN** el feed se vuelve a consultar

#### Scenario: Pestaña oculta

- **WHEN** la pestaña no está visible
- **THEN** no se realizan consultas periódicas
