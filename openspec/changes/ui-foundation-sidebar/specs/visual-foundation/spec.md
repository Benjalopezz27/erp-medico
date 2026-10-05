## Purpose

Define la base visual compartida de la aplicación (tipografía, radios, sombras, bordes y fondo) para que todas las pantallas se vean consistentes y suaves.

## ADDED Requirements

### Requirement: Tipografía Poppins

La aplicación MUST renderizar todo el texto con la fuente Poppins, servida desde los assets propios de la aplicación sin depender de un CDN externo.

#### Scenario: Fuente aplicada globalmente

- **WHEN** se carga cualquier pantalla
- **THEN** el texto usa Poppins como familia sans por defecto

#### Scenario: Sin dependencia externa

- **WHEN** el navegador no tiene acceso a Internet salvo al servidor de la aplicación
- **THEN** Poppins se sigue cargando correctamente

### Requirement: Escala de radios suaves

La aplicación MUST usar una escala de radios más redondeada: `lg` = 0.75rem, `xl` = 1rem y `2xl` = 1.25rem, aplicada también a clases ya existentes en pantallas sin editarlas una por una.

#### Scenario: Clases existentes heredan el nuevo radio

- **WHEN** un componente usa `rounded-lg` o `rounded-xl`
- **THEN** se dibuja con el radio de la nueva escala

### Requirement: Primitivas suaves

Las primitivas de UI (Card, Button, Input, Select, Modal, Badge) MUST usar bordes redondeados de la nueva escala, sombras suaves y bordes de baja intensidad; el Badge MUST ser pill.

#### Scenario: Card y Modal

- **WHEN** se renderiza una Card o un Modal
- **THEN** usa radio `2xl`, sombra suave y borde de baja intensidad

#### Scenario: Controles de formulario

- **WHEN** se renderiza un Button, Input o Select
- **THEN** usa radio `xl`

### Requirement: Fondo de página

El fondo del área de contenido MUST ser `slate-50` y las superficies (cards, tablas) MUST ser blancas para generar contraste suave.

#### Scenario: Contraste de superficies

- **WHEN** se muestra una pantalla con cards
- **THEN** las cards blancas se distinguen del fondo `slate-50`

### Requirement: Legibilidad de montos

Las columnas y valores monetarios MUST permanecer alineados y legibles con Poppins.

#### Scenario: Columna de montos

- **WHEN** una tabla muestra montos en una columna
- **THEN** los montos se alinean a la derecha y los dígitos mantienen ancho uniforme entre filas
