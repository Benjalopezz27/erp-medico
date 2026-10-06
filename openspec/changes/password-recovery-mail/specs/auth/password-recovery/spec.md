# Spec Delta

## Purpose

Permite a un usuario activo recuperar el acceso al sistema cuando olvida su contraseña, mediante un link de un solo uso enviado por mail, sin intervención de soporte y sin revelar qué emails existen.

## ADDED Requirements

### Requirement: Solicitud de recuperación sin enumeración

`POST /auth/forgot-password` SHALL responder 200 con el mismo cuerpo y en tiempo similar exista o no el email, y SHALL enviar el mail solo si el usuario existe y está activo.

#### Scenario: Usuario activo

- **WHEN** se pide recuperación para el email de un usuario activo
- **THEN** responde 200 con el mensaje genérico, se crea un token y se encola un mail con el link

#### Scenario: Email inexistente o usuario pendiente de aprobación

- **WHEN** se pide recuperación para un email inexistente o de un usuario inactivo
- **THEN** responde 200 con el mismo mensaje y no se crea token ni se encola mail

#### Scenario: Token anterior

- **WHEN** un usuario pide un segundo token
- **THEN** los tokens previos sin usar de ese usuario dejan de ser válidos

### Requirement: Token de un solo uso con vencimiento

El token SHALL ser aleatorio, persistirse únicamente como hash sha256, vencer a los 30 minutos y poder usarse una sola vez.

#### Scenario: Token válido

- **WHEN** se llama `POST /auth/reset-password` con un token vigente y una contraseña válida
- **THEN** responde 200, la contraseña se actualiza con bcrypt costo 12, el token queda usado y los demás tokens del usuario se invalidan

#### Scenario: Token vencido, usado o desconocido

- **WHEN** se llama `POST /auth/reset-password` con un token vencido, ya usado o inexistente
- **THEN** responde 400 y la contraseña no cambia

#### Scenario: Contraseña débil

- **WHEN** `newPassword` incumple las reglas de alta de usuario
- **THEN** responde 400 y el token sigue vigente

### Requirement: Rate limiting

Ambos endpoints SHALL limitar solicitudes por IP y por email.

#### Scenario: Exceso de pedidos

- **WHEN** se supera el límite configurado
- **THEN** responde 429

### Requirement: Envío de mail resiliente

El mail SHALL enviarse por la cola con reintentos y backoff; la request no espera al proveedor. En dev/test el link SHALL loguearse en lugar de enviarse.

#### Scenario: Proveedor falla

- **WHEN** el proveedor responde error al procesar el job
- **THEN** el job se reintenta con backoff y `forgot-password` ya respondió 200

#### Scenario: Token fuera de logs

- **WHEN** el sistema opera en producción
- **THEN** el token ni el link se escriben en logs

### Requirement: Pantallas de recuperación

El frontend SHALL ofrecer el link "¿Olvidaste tu contraseña?" en login, la página `/forgot-password` (siempre muestra "Si el email existe, te enviamos un link") y `/reset-password?token=…`.

#### Scenario: Reset exitoso

- **WHEN** el usuario envía nueva contraseña y confirmación coincidentes con un token válido
- **THEN** se redirige a login

#### Scenario: Token inválido o vencido

- **WHEN** la API responde 400 o falta el token en la URL
- **THEN** la página muestra el estado de token inválido con opción de pedir otro link
