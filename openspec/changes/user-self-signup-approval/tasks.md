# Tasks

## 1. Backend — registro (#241)

- [x] 1.1 Test que falla: `auth.service.spec.ts` (register crea VENDEDOR inactivo, sin token; 409 propagado) y `auth.controller.spec.ts`.
- [x] 1.2 `auth/dto/register.dto.ts` (`PickType(CreateUserDto, ['name','email','password'])`) + export en `dto/index.ts`.
- [x] 1.3 `AuthService.register` + `POST /auth/register` con `@Throttle` igual a login y Swagger 201/400/409/429.
- [x] 1.4 Login: inactivo con password correcta → 403. Actualizar tests existentes de `auth.service.spec.ts`.
- [x] 1.5 e2e `auth.e2e-spec.ts`: register → login 403 → admin PATCH isActive → login 200; role ignorado.

## 2. Frontend — componente y signup (#241)

- [x] 2.1 `components/ui/password-input.tsx` (+ spec).
- [x] 2.2 `signupSchema` en `auth.schema.ts` (+ spec), `registerRequest` en `auth.api.ts`, `use-register-mutation.ts`.
- [x] 2.3 `SignupPage.tsx` (+ spec), ruta `/signup` pública en `router.tsx`, links Login ↔ Signup.

## 3. Frontend — login (#243)

- [x] 3.1 `LoginPage.tsx` usa `PasswordInput`, placeholders; `getLoginErrorMessage` cubre 401/403/429/red. Actualizar `LoginPage.spec.tsx`.

## 4. Frontend — aprobación (#242)

- [x] 4.1 `UserTable`/`UsersPage`: fila inactiva con "Aprobar" + modal de confirmación + banner de éxito (el filtro de estado existente cubre "Pendientes"). Actualizar `UsersPage.spec.tsx`.

## 5. Verificación

- [x] 5.1 `pnpm run format:check && pnpm -r run lint && pnpm test && pnpm build`.
- [ ] 5.2 Smoke manual: signup → login bloqueado (mensaje) → admin aprueba → login OK.
