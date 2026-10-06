# Design

## Decisiones

- **Módulos**: `modules/mail` nuevo con `MailService` (interfaz `sendPasswordReset(to, link)`) y un único proveedor Resend (`POST https://api.resend.com/emails` con `fetch`, sin SDK). Si `NODE_ENV` es `development`/`test` o falta `MAIL_API_KEY`, solo loguea el link. Cambiar de proveedor toca solo este módulo.
- **Cola**: `mail-send` siguiendo el patrón de `pdf-generate` (`MailQueueService` productor en `QueueProducerModule`, `MailSendProcessor` en `QueueConsumerModule`), `attempts: 5`, backoff exponencial. El job lleva `{ to, token }`; el link se arma en el procesador con `APP_PUBLIC_URL`. El token viaja en Redis hasta que el job termina (`removeOnComplete`/`removeOnFail` con `count` bajo); es de 30 min y un solo uso, riesgo aceptado.
- **Datos**: entidad `PasswordResetToken` en `modules/auth/entities`, migración `CreatePasswordResetTokens` (FK `ON DELETE CASCADE`, `token_hash` UNIQUE). Token = `randomBytes(32)` base64url; se guarda `sha256`.
- **Servicio**: `PasswordRecoveryService` separado de `AuthService` (alta cohesión). `forgot`: normaliza email, busca usuario; si activo, en una transacción marca `used_at` los tokens vivos previos, inserta el nuevo y encola. Si no existe/inactivo, no hace nada; ambos caminos devuelven el mismo mensaje. Para igualar tiempo se encola/escribe fuera del camino de respuesta (el trabajo pesado va a la cola y la BD) — diferencia residual despreciable frente al throttle.
- **Reset**: en transacción con `SELECT … FOR UPDATE` del token por hash; valida `used_at IS NULL` y `expires_at > now`; `bcrypt.hash(pw, 12)`; actualiza `passwordHash`; marca `used_at`; invalida los restantes del usuario. Cualquier fallo de validación → 400 genérico.
- **DTOs**: `ForgotPasswordDto { email }` (misma normalización que `LoginDto`), `ResetPasswordDto { token, newPassword }` con validadores de password reutilizados de `CreateUserDto`.
- **Throttle**: `@Throttle` por IP (envs existentes) y por email con un `ThrottlerGuard` que usa `req.body.email` en `getTracker` para `forgot-password`; para `reset-password` solo IP.
- **Frontend**: `forgotPasswordSchema` / `resetPasswordSchema` en `auth.schema.ts` (regex de alta + confirmación), `auth.api.ts`, hooks de mutación, `ForgotPasswordPage`, `ResetPasswordPage` (lee `token` con TanStack Router `validateSearch`; `<meta name="referrer" content="no-referrer">` montado en la página), rutas públicas.
- **Sesiones**: sin revocación; se agrega nota a D-10.

## Riesgos

- Entregabilidad depende de SPF/DKIM/DMARC del dominio de envío → verificación en staging pendiente del owner (`needs:client`).
- Enumeración por timing: mitigada por throttle y trabajo asíncrono.
