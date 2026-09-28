# Design

## Decisiones

- **Sin `status` nuevo**: `isActive=false` = pendiente/inactivo (decisión 2026-09-27, evita migración).
- **DTO**: `RegisterDto extends PickType(CreateUserDto, ['name','email','password'])`. Reusa validadores y con `whitelist` descarta `role`/`isActive` enviados por el cliente (evita escalada de privilegios).
- **Servicio**: `AuthService.register` llama `UsersService.createInternal({ role: VENDEDOR, isActive: false, passwordHash })`; ya lanza `ConflictException` (409) en duplicado y normaliza email. Devuelve `{ message }`, sin token.
- **Login inactivo**: hoy 401 genérico. Cambia a 403 `ForbiddenException('Account pending approval')` **solo si la contraseña coincide** y `!isActive`. Con password incorrecta sigue 401 → no se puede enumerar emails.
- **Throttle**: mismas env (`THROTTLE_LIMIT_LOGIN`, `THROTTLE_TTL_MS`) que login.
- **Aprobación**: endpoints existentes. UI: botón "Reactivar" pasa a "Aprobar" en filas inactivas, con modal de confirmación (patrón `UserDeactivateModal`).
- **Frontend**: `PasswordInput` en `components/ui/` (input + botón ojo, `aria-label` y `aria-pressed`). Schema zod de signup replica regex del backend.
- **Mapeo de errores**: helper por status (401/403/409/400/429/sin respuesta) para login y signup.

## Riesgos

- 409 en `/auth/register` permite enumerar emails registrados; lo exige la issue, mitigado por throttle 5/min.
