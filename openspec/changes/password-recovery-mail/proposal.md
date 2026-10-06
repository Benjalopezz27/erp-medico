# Proposal

## Why

Un usuario que olvida su contraseña queda bloqueado hasta que alguien cambia el hash a mano en la base (`AuthService` solo expone `register` y `login`). Issue #277. Railway no provee correo, así que el flujo requiere un proveedor transaccional externo.

## What Changes

- `POST /auth/forgot-password { email }` → 200 con mensaje idéntico exista o no el email (sin enumeración). Solo usuarios activos reciben mail.
- `POST /auth/reset-password { token, newPassword }` → 200 | 400 (token inválido/vencido/usado). Rehash `bcrypt` costo 12.
- Tabla `password_reset_tokens` (token guardado como sha256, 30 min, un solo uso). Pedir uno nuevo invalida los anteriores.
- Envío por la cola BullMQ (`mail-send`) con reintentos y backoff.
- `MailService` con una sola implementación por API HTTPS (**Resend**, decisión del owner 2026-10-06); en dev/test solo loguea el link.
- Throttle en ambos endpoints (por IP y por email).
- Frontend: link "¿Olvidaste tu contraseña?" en login, `/forgot-password`, `/reset-password?token=…` (`Referrer-Policy: no-referrer`).
- Env: `MAIL_API_KEY`, `MAIL_FROM`, `APP_PUBLIC_URL`, documentadas en `docs/deployment/`.
- Los JWT ya emitidos siguen válidos tras el reset: se documenta en `docs/DEBT.md` D-10 (sin `token_version`).

## Capabilities

### New Capabilities

- `auth/password-recovery`: recuperación de contraseña por mail con token de un solo uso.

### Modified Capabilities

(ninguna)

## Impact

- Backend: `modules/auth` (controller, service, DTOs, entidad), nuevo `modules/mail`, `modules/queue` (cola, productor, procesador), migración TypeORM, `.env.example`.
- Frontend: `features/auth` (schema, api, hooks, 2 páginas), `router.tsx`, `LoginPage.tsx`.
- Sin dependencias nuevas: el envío usa `fetch` nativo (Node 24).
- Fuera de alcance: verificación en staging (requiere cuenta Resend + dominio SPF/DKIM, pendiente del owner), otros mails, revocación de sesiones.
