# Proposal

## Why

Hoy cada cuenta la crea un admin vía `POST /users`. Decisión del owner (2026-09-27): habilitar autoregistro público sin perder control de acceso — ERP médico, ninguna cuenta queda activa sola. Cubre las issues #241 (autoregistro), #242 (aprobación admin) y #243 (UX de login alineada con signup).

## What Changes

- **#241** `POST /auth/register` público (throttle 5/min como login): crea usuario `role=VENDEDOR`, `isActive=false`, sin JWT. Duplicado → 409. Página `/signup` con toggle de contraseña, hint de requisitos, errores inline y mapeo 409/400/429. Éxito: mensaje "pendiente de aprobación", sin sesión.
- **#242** El backend ya soporta `GET /users?isActive=false` y `PATCH /users/:id {isActive:true}` (admin-only): sin endpoints nuevos. UI admin: en el listado existente, filas inactivas muestran "Aprobar" con confirmación y toast; atajo de filtro "Pendientes".
- **#243** Login: toggle mostrar/ocultar contraseña (componente compartido con signup), placeholders, y errores diferenciados: credenciales inválidas (401), cuenta pendiente (403, solo tras password correcta → no revela existencia del email), rate-limit (429).
- Sin migración: se reusa `User.isActive`.

## Capabilities

### New Capabilities

- `auth/user-self-signup`: alta pública de cuenta inactiva.
- `users/pending-account-approval`: aprobación admin de cuentas pendientes.
- `auth/login-ux`: login con toggle de contraseña y errores diferenciados.

### Modified Capabilities

(ninguna — no hay specs archivadas)

## Impact

- Backend: `auth.controller.ts`, `auth.service.ts`, nuevo `auth/dto/register.dto.ts` (PickType de `CreateUserDto`); `users.service.ts` sin cambios (usa `createInternal`).
- Frontend: nuevo `PasswordInput`, `SignupPage`, `auth.schema.ts`, `auth.api.ts`, router, `LoginPage.tsx`, `UserTable.tsx`, `UsersPage.tsx`.
- Docs: Swagger (decoradores), sin cambios a `docs/` salvo este change.
- Riesgo: un usuario desactivado por admin ve el mismo mensaje "pendiente/inactiva" que uno sin aprobar (no hay campo que los distinga). Aceptado; el mensaje es neutro.
- Fuera de alcance: verificación de email, notificación al aprobado, captcha.
