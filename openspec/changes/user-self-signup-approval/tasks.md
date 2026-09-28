# Tasks

## 1. Backend — registro (#241)

- [ ] 1.1 Test que falla: `auth.service.spec.ts` (register crea VENDEDOR inactivo, sin token; 409 propagado) y `auth.controller.spec.ts`.
- [ ] 1.2 `auth/dto/register.dto.ts` (`PickType(CreateUserDto, ['name','email','password'])`) + export en `dto/index.ts`.
- [ ] 1.3 `AuthService.register` + `POST /auth/register` con `@Throttle` igual a login y Swagger 201/400/409/429.
- [ ] 1.4 Login: inactivo con password correcta → 403. Actualizar tests existentes de `auth.service.spec.ts`.
- [ ] 1.5 e2e `auth.e2e-spec.ts`: register → login 403 → admin PATCH isActive → login 200; role ignorado.

## 2. Frontend — componente y signup (#241)

- [ ] 2.1 `components/ui/password-input.tsx` (+ spec).
- [ ] 2.2 `signupSchema` en `auth.schema.ts` (+ spec), `registerRequest` en `auth.api.ts`, `use-register-mutation.ts`.
- [ ] 2.3 `SignupPage.tsx` (+ spec), ruta `/signup` pública en `router.tsx`, links Login ↔ Signup.

## 3. Frontend — login (#243)

- [ ] 3.1 `LoginPage.tsx` usa `PasswordInput`, placeholders; `getLoginErrorMessage` cubre 401/403/429/red. Actualizar `LoginPage.spec.tsx`.

## 4. Frontend — aprobación (#242)

- [ ] 4.1 `UserTable`/`UsersPage`: fila inactiva con "Aprobar" + modal de confirmación + toast; atajo de filtro "Pendientes". Actualizar `UsersPage.spec.tsx`.

## 5. Verificación

- [ ] 5.1 `pnpm run format:check && pnpm -r run lint && pnpm test && pnpm build`.
- [ ] 5.2 Smoke manual: signup → login bloqueado (mensaje) → admin aprueba → login OK.
