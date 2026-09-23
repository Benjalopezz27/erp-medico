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
