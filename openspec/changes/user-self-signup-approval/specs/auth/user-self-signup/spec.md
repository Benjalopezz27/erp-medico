# Spec Delta

## Purpose

Permite a una persona crear su propia cuenta, que queda inactiva hasta aprobación de un administrador.

## ADDED Requirements

### Requirement: Autoregistro público

El sistema SHALL exponer `POST /auth/register` sin autenticación, que crea un usuario con rol `VENDEDOR` e `isActive=false` y NO emite token.

#### Scenario: Registro exitoso

- **WHEN** se envía nombre, email y contraseña válidos
- **THEN** responde 201, el usuario existe con `isActive=false` y `role=VENDEDOR`, y la respuesta no contiene `accessToken`

#### Scenario: Email duplicado

- **WHEN** el email ya existe
- **THEN** responde 409 con mensaje claro

#### Scenario: Contraseña inválida

- **WHEN** la contraseña incumple longitud 8-128 o mayúscula+minúscula+(dígito|símbolo)
- **THEN** responde 400

#### Scenario: Cliente intenta fijar rol o estado

- **WHEN** el body incluye `role` o `isActive`
- **THEN** se ignoran; la cuenta se crea `VENDEDOR` inactiva

#### Scenario: Rate limit

- **WHEN** se superan 5 solicitudes por minuto desde el mismo origen
- **THEN** responde 429

### Requirement: Pantalla de signup

La UI SHALL ofrecer `/signup` con nombre, email, contraseña y confirmación, toggle mostrar/ocultar, hint de requisitos, errores inline y mensajes específicos para 409, 400 y 429. Tras el éxito SHALL mostrar "cuenta creada, pendiente de aprobación" sin crear sesión ni redirigir.
