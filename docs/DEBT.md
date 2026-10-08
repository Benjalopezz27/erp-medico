# Deuda técnica registrada

La deuda se acepta a propósito o no se acepta (§4.3). La que se acumula sin registrar es el
default más caro.

Quién acepta: deuda local → el developer, registrándola. Cruza módulos o afecta el modelo de
datos → owner técnico. Afecta seguridad, datos de cliente o contrato → Dirección, por escrito.

---

## D-01 · Board de GitHub Projects sin schema ASOME de referencia

- **Qué hay:** el proyecto #1 (`erp-medico`) usa el schema por defecto de GitHub Projects
  (`Status`: Backlog/To Do/In progress/Done · `Priority`: P0/P1/P2 · `Size`: XS-XL). No existen
  los campos `Kind`, `Area` ni `Sprint` (iteration) que el schema de referencia de `asome-setup`
  espera.
- **Qué correspondía:** crear esos campos en el board durante este bootstrap.
- **Por qué no se hizo acá:** son campos de un recurso compartido (el GitHub Project), no del
  repo — crearlos sin acuerdo del equipo cambia cómo se ve el board para todos. Se dejó para una
  decisión explícita del owner técnico.
- **Costo de seguir así:** skills como `asome-sprint` que esperan `Kind`/`Area`/`Sprint` no van
  a encontrar esos campos en este proyecto.
- **Trigger para resolver:** la próxima vez que se use `/asome-sprint plan` o similar sobre este
  board y falle por campo faltante.

## D-02 · Contenido de `docs/*.md` pre-ASOME no migrado a `docs/product/` ni a ADRs

- **Qué hay:** `docs/domain_model.md`, `docs/functional_specification.md`,
  `docs/mvp_backlog.md`, `docs/sprint_plan.md`, `docs/tech_stack.md`, `docs/decimal_policy.md`,
  `docs/git_workflow.md`, `docs/startup_checklist.md` — documentación real y en uso, con formato
  propio del proyecto, no el formato ASOME (7 bloques de HU, ADR).
- **Qué correspondía:** decisiones ya tomadas ahí (ej. elección de stack en `tech_stack.md`,
  política de decimales) documentarlas como ADR; historias de `mvp_backlog.md` al formato de
  `asome-discovery`.
- **Por qué no se hizo en este PR:** §14.7 del manual — proyectos existentes no se migran de
  golpe. Migrar sin revisión humana puede perder contexto o duplicar la fuente de verdad.
- **Costo de seguir así:** dos formatos de documentación conviviendo; un agente nuevo puede no
  saber cuál es la fuente de verdad.
- **Trigger para resolver:** próxima decisión arquitectónica nueva → va directo a ADR. Migración
  del resto, a criterio del owner técnico.

## D-03 · Sin harness secundario (Codex) verificado para cross-review

- **Qué hay:** `command -v codex` no encontrado en la máquina auditada durante este bootstrap.
- **Qué correspondía:** §7.10 pide un segundo harness para review cruzado.
- **Costo de seguir así:** el review de código de un agente lo termina aprobando el mismo
  proveedor de modelo que lo escribió.
- **Trigger para resolver:** instalar Codex CLI antes del primer PR que dependa de cross-review
  formal.

## D-04 · Node del sistema por debajo del mínimo del proyecto

- **Qué hay:** `package.json` fija `engines.node: ">=24.0.0 <25.0.0"`; CI corre en Node 24.x. La
  máquina de desarrollo auditada en este bootstrap tenía Node 18.19.1 como versión de sistema
  (se usó `nvm use 20` puntualmente para poder correr `openspec init`).
- **Costo de seguir así:** comandos que dependen de features nuevas de Node (como el formatter
  de `secretlint`, que crasheó bajo Node 18 aunque igual bloqueó el commit) fallan o dan salida
  degradada en local.
- **Trigger para resolver:** `nvm alias default 24` (o equivalente) en cada máquina de
  desarrollo antes de trabajar en este repo.

## D-05 · Default branch de GitHub es `main`, no `dev`

- **Qué hay:** `gh repo view --json defaultBranchRef` devuelve `main`. `.asome/config.json`
  declara `dev` como rama de integración.
- **Costo de seguir así:** un `git clone` fresco deja a cualquiera (persona o agente) parado en
  `main` en vez de `dev`.
- **Trigger para resolver:** cambiar el default branch en GitHub Settings a `dev` — una acción
  de un click que requiere acceso de administrador del repo, no se hizo en este bootstrap por
  ser un cambio de configuración del repositorio fuera del PR.

## D-06 · Branch protection no configurada en `dev` (CRITICAL)

- **Qué hay:** `gh api repos/Benjalopezz27/erp-medico/branches/dev/protection` devuelve `404
Branch not protected` — a diferencia de un plan que lo bloquea (403 Upgrade), acá el mecanismo
  existe y simplemente no está activado.
- **Costo de seguir así:** §5.1, §9.5 y §10.3 dependen solo del hook local `pre-commit`, que se
  saltea con `--no-verify`. Nada impide un push directo a `dev` desde GitHub.
- **Trigger para resolver:** activar branch protection en GitHub Settings para `dev` (y `main`)
  — requiere acceso de administrador del repo, no se hizo en este bootstrap.

## D-07 · Chequeos de rol dispersos fuera de `RolesGuard`

- **Qué hay:** `RolesGuard` (`apps/backend/src/modules/auth/guards/roles.guard.ts`) es el punto
  único de evaluación de permisos a nivel endpoint (`@Roles` + reflector). Pero hay lógica de
  negocio que vuelve a comparar `role === UserRole.X` fuera de ese punto:
  `modules/users/users.service.ts:280,285`, `modules/products/mappers/product.mapper.ts:133`,
  `modules/customers/customers.service.ts:55,63,169`.
- **Por qué importa:** son reglas de negocio dependientes de rol (ej. ocultar precio de costo a
  `VENDEDOR`, límites de crédito), no necesariamente una autorización de endpoint duplicada — pero
  el invariante de `foundations-canon.md` pide un único punto de evaluación de permisos para que
  un cambio de política no se tenga que replicar en varios lugares. Auditar caso por caso si son
  reglas de dominio legítimas o autorización que debería vivir en el guard/decorator.
- **Trigger para resolver:** próxima vez que se agregue o cambie una regla de acceso por rol —
  evaluar ahí si corresponde consolidar.

## D-08 · Denegaciones de `RolesGuard` no quedan auditadas

- **Qué hay:** existe un módulo de auditoría completo (`modules/audit`, `AuditService`,
  `AuditLog` entity) pero `RolesGuard` no lo invoca al lanzar `ForbiddenException` o
  `UnauthorizedException` — la denegación de acceso no genera un evento de auditoría.
- **Por qué importa:** `foundations-canon.md` pide auditoría instrumentada en el mismo punto
  único de evaluación de permisos — hoy un intento de acceso no autorizado no queda trazado.
- **Trigger para resolver:** antes de la prueba de aceptación de roles/permisos que pida el
  cliente o el manual; se registra acá para no perderlo, no se corrige en este PR (Step 15 de
  `asome-setup` es de auditoría, no de fix).

## D-09 · Cheque endosado no se puede rechazar

- **Qué hay:** `PATCH /checks/:id/reject` acepta solo cheques `EN_CARTERA` o `DEPOSITADO`
  (decisión del cambio `check-lifecycle-reversal`, las 5 transiciones del DoD del Sprint 9). Un
  cheque `ENDOSADO` a proveedor que el banco rechaza no se puede revertir en el sistema.
- **Por qué importa:** la deuda del cliente queda cancelada aunque el cheque rebotó; hoy se
  corrige a mano. El endoso tampoco genera cuenta a pagar del proveedor.
- **Trigger para resolver:** cuando el cliente use endosos en producción o al implementar
  tesorería/cuentas a pagar (Sprint 10); agregar la transición `ENDOSADO → RECHAZADO` con nota de
  alerta para el proveedor.

## D-10 · Cambiar la contraseña no invalida los JWT ya emitidos

- **Qué hay:** `POST /users/me/change-password` (#280) guarda el hash nuevo, pero el JWT es
  stateless (`JwtStrategy.validate` solo revisa `isActive`, rol y email): no hay revocación ni
  versión de token, así que las sesiones abiertas siguen válidas hasta que expiran. Lo mismo
  aplica a `POST /auth/reset-password` (#277): resetear la clave por mail tampoco revoca JWT.
- **Por qué importa:** quien robó un token conserva acceso después de que la víctima cambia su
  contraseña.
- **Trigger para resolver:** al agregar refresh tokens o un campo `token_version`/`password_changed_at`
  comparado contra `iat` en `JwtStrategy`; o ante un incidente de cuenta comprometida.

## D-12 · Deuda aceptada de la auditoría #255

- **Resuelto en `fix/296-301-audit-255-findings`:** A-1 (#296), A-2 (#297), A-3 (#298; cierra
  D-11 ítem 2), H-1 (#299). De #300: M-1, M-2, M-3, M-4, M-5 (carrera con el cierre), M-6
  (pool de conexiones), H-2, H-4 parcial (`proxy-addr`, `seroval`, `source-map-js`), H-5. De #301:
  B-1, B-2, B-4, B-6, B-8, B-9 (login por email), B-11, B-12, B-13 (Redis), B-14, B-16
  (umbral de cobertura).
- **Decisiones tomadas (revisables):**
  - M-2/M-3: la nota de crédito compensa solo la deuda abierta; el resto se devuelve con un
    EGRESO de tesorería (venta contado: cuenta del medio original; factura ya cobrada: efectivo).
    No existe "saldo a favor" del cliente. Una devolución se rechaza hasta que la factura original
    tenga CAE (`SALE_RETURN_INVOICE_NOT_EMITTED`).
  - M-4: se mantiene `RECHAZADO` (reintentable, el reintento consulta ARCA antes de pedir otro CAE)
    pero con código `CAE_UNCERTAIN` cuando el CAE pudo haberse emitido.
  - M-5: los movimientos de efectivo y el cierre se serializan. **No** se exige caja abierta para
    vender o cobrar (cambiaría la operatoria de mostrador).
  - M-6: no se movió la emisión fuera de la transacción; se agrandó el pool (`DB_POOL_MAX`, 20).
  - H-2: cambiar o resetear la contraseña invalida los JWT anteriores (incluido el de quien la
    cambia: tiene que volver a loguearse). Sigue sin refresh token.
- **Qué queda (issues #300 y #301 siguen abiertas):**
  - H-3 JWT en `localStorage`: requiere cookie httpOnly + CSRF (cambio de contrato front/back);
    mitigado parcialmente con la CSP de H-5.
  - H-4: `node-forge` y `braces` sin parche; `@nestjs/core` ≥11.1.18, `file-type` ≥21,
    `uuid` ≥11 y `postcss-selector-parser` ≥7 piden salto de major.
  - B-3 `number`/`toFixed` en rutas de dinero (sin error demostrable; tocar el camino fiscal pide
    su propio cambio con spec), B-5 saldo de efectivo negativo y cliente inactivo en cobros (cobrar
    a un inactivo con deuda es legítimo: decisión de negocio), B-7 emisión post-commit (la emisión
    manual es el diseño de `manual-invoice-emission`), B-9 enumeración en `/auth/register`, B-10
    endpoints `status` públicos (solo devuelven "initialized"; ahora son `@Public()` explícitos) y
    Swagger por nginx, B-12 `--audit-level=high`, B-13 TLS entre contenedores, B-15 visibilidad
    de ventas por vendedor (decisión de negocio), B-16 e2e de tesorería y esperas con `setTimeout`.
- **Costo de seguir así:** sesiones robadas por XSS válidas hasta 8 h, `pnpm audit` en CI solo
  bloquea críticos.
- **Trigger para resolver:** antes de abrir el sistema a más usuarios (H-3) o cuando
  `node-forge`/`braces` tengan parche (subir el gate a `high`).

## D-11 · Brechas halladas por la regresión e2e (#264)

- **Qué hay:**
  1. El dominio no modela lote ni vencimiento (ni `stocks` ni `products`): no hay FEFO ni alertas
     de vencimiento. El scope de #264 pedía un caso borde "producto con lote/vencimiento".
  2. ~~`POST /sales` no tiene idempotency key~~ — resuelto en #298 (`idempotencyKey` + hash del
     cuerpo; el POS lo envía).
  3. `GET /reports/sales` usa `JOIN customers`: las ventas de mostrador sin cliente
     (`customer_id` NULL) no aparecen en "Ventas por período".
- **Costo de seguir así:** (1) sin trazabilidad de lotes en una distribuidora médica; (2) un doble
  clic en el POS puede duplicar la venta; (3) el reporte subestima las ventas.
- **Trigger para resolver:** (1) cuando el cliente confirme que lo necesita (feature aparte, con
  migración y spec); (2) antes de la salida a producción del POS; (3) fix de una línea
  (`LEFT JOIN` + `COALESCE`), a priorizar por el owner técnico.
