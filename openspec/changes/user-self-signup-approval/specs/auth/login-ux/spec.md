# Spec Delta

## Purpose

Login seguro y con errores específicos, consistente con signup.

## ADDED Requirements

### Requirement: Errores de login diferenciados

El sistema SHALL responder 403 en login cuando la contraseña es correcta y la cuenta está inactiva, y 401 cuando las credenciales son inválidas o el email no existe. La UI SHALL mostrar mensajes distintos para 401, 403 ("tu cuenta aún no fue aprobada"), 429 y falta de conexión.

#### Scenario: Cuenta pendiente con contraseña correcta

- **WHEN** login con credenciales correctas de cuenta `isActive=false`
- **THEN** responde 403 y la UI muestra "Tu cuenta aún no fue aprobada"

#### Scenario: Cuenta pendiente con contraseña incorrecta

- **WHEN** login con contraseña incorrecta de cuenta `isActive=false`
- **THEN** responde 401 (igual que email inexistente)

### Requirement: Toggle de contraseña y placeholders

El input de contraseña de login y signup SHALL usar el mismo componente con botón mostrar/ocultar accesible, y ambos campos SHALL tener placeholders claros.
