# Tasks

## 1. Backend — datos y mail

- [x] 1.1 Entidad `PasswordResetToken` + migración `CreatePasswordResetTokens`; verificar con `pnpm --filter backend build` y migración local up/down.
- [x] 1.2 `modules/mail`: `MailService` (Resend por `fetch`, modo log en dev/test) + spec con `fetch` mockeado (éxito, error HTTP, modo log).
- [x] 1.3 Cola `mail-send`: constantes, `MailQueueService`, `MailSendProcessor` (arma link con `APP_PUBLIC_URL`) + specs; registrar en módulos producer/consumer.

## 2. Backend — API

- [x] 2.1 DTOs `ForgotPasswordDto`/`ResetPasswordDto` + export en `dto/index.ts`.
- [x] 2.2 `PasswordRecoveryService` (forgot/reset) + spec: activo, inexistente, inactivo, token válido, vencido, reusado, invalidación de previos.
- [x] 2.3 Endpoints en `AuthController` con `@Throttle` (IP + email) y Swagger 200/400/429; actualizar `auth.controller.spec.ts`.
- [x] 2.4 Env `MAIL_API_KEY`, `MAIL_FROM`, `APP_PUBLIC_URL` en `.env.example` y `docs/deployment/mail-provider.md`; nota en `docs/DEBT.md` D-10.

## 3. Frontend

- [ ] 3.1 Schemas zod + `auth.api.ts` + hooks de mutación, con specs.
- [ ] 3.2 `ForgotPasswordPage` y `ResetPasswordPage` (estados token inválido, éxito → login) + specs; rutas públicas en `router.tsx`.
- [ ] 3.3 Link "¿Olvidaste tu contraseña?" en `LoginPage.tsx` + actualizar `LoginPage.spec.tsx`.

## 4. Verificación

- [ ] 4.1 `pnpm run format:check && pnpm -r run lint && pnpm test && pnpm build`.
- [ ] 4.2 Smoke con Chrome: forgot → link logueado → reset → login con clave nueva.
- [ ] 4.3 (Pendiente owner) Mail real en staging desde dominio verificado.
