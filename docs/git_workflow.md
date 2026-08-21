# Git Workflow & Branch Strategy — ERP Distribuidora Médica

**Versión:** 1.0  
**Modelo:** Single Developer  
**Repositorio:** GitHub (`erp-medico`)  
**Stack relevante:** pnpm monorepo · Node.js · GitHub Actions

---

## 1. Filosofía General

Este proyecto tiene **un solo desarrollador** y un cliente con demos semanales. El workflow debe ser:

- **Simple**: pocas ramas, pocas reglas
- **Seguro**: `main` siempre deployable a producción
- **Trazable**: cada commit linkeable a una User Story
- **Sin overhead**: nada de PR reviews entre pares — se reemplaza por self-review checklist

---

## 2. Estructura de Ramas

```
main
 └── dev
      ├── feat/s1-us01-auth-jwt
      ├── feat/s1-us02-user-management
      ├── feat/s2-us06-stock-ledger
      ├── fix/stock-negative-edge-case
      └── hotfix/arca-token-refresh   (→ merge a main Y dev)
```

### `main`

- **Propósito:** Producción. Lo que está desplegado en Hetzner.
- **Regla:** Solo recibe merges desde `dev` al finalizar un **milestone de pago** (cada 25% del proyecto) o releases intermedios acordados con el cliente.
- **Protección:** Branch protection rule en GitHub:
  - Require PR before merging
  - Require CI to pass (GitHub Actions)
  - No force push

### `dev`

- **Propósito:** Integración continua. Staging / demo del cliente.
- **Regla:** Toda feature branch se mergea aquí al terminar la historia. Es la rama que el cliente ve en los demos de fin de sprint.
- **Protección:** Require CI to pass. Sí permite self-merge (sin PR review requerido de otro dev).

### `feat/sN-usXX-descripcion`

- **Propósito:** Una rama por User Story.
- **Nomeneclatura:** `feat/s{sprint}-us{numero}-{descripcion-corta-kebab}`
  - Ejemplos: `feat/s1-us01-auth-jwt`, `feat/s3-us13-importer-wizard`, `feat/s8-us26-arca-wsfe`
- **Vida:** Se crea desde `dev`, se mergea a `dev`, se elimina después del merge.
- **Tamaño:** Una historia = una rama. Si la historia es muy grande, se puede subdividir en `feat/s1-us04-product-form` y `feat/s1-us04-unit-conversions`.

### `fix/descripcion`

- **Propósito:** Bug fixes encontrados durante el sprint en curso (no urgentes).
- **Base:** Desde `dev`.
- **Nomeneclatura:** `fix/descripcion-corta-kebab`
  - Ejemplo: `fix/stock-negative-concurrent-edge`

### `hotfix/descripcion`

- **Propósito:** Bug crítico en producción (`main`) que no puede esperar al fin del sprint.
- **Base:** Desde `main`.
- **Merge:** A `main` **Y** a `dev` (para no perder el fix en el siguiente release).
- **Ejemplo:** `hotfix/arca-duplicate-cae-on-retry`

---

## 3. Convención de Commits — Conventional Commits

Usar el estándar [Conventional Commits](https://www.conventionalcommits.org/) con el número de US como scope.

### Formato

```
<tipo>(<scope>): <descripción imperativa en minúsculas>

[cuerpo opcional — contexto adicional]

[footer opcional — referencias]
```

### Tipos permitidos

| Tipo       | Cuándo usarlo                                             |
| ---------- | --------------------------------------------------------- |
| `feat`     | Nueva funcionalidad de usuario                            |
| `fix`      | Corrección de bug                                         |
| `refactor` | Cambio de código sin cambio de comportamiento externo     |
| `test`     | Agregar o corregir tests                                  |
| `docs`     | Cambios en documentación                                  |
| `chore`    | Tareas de mantenimiento (deps, config, scripts)           |
| `ci`       | Cambios en GitHub Actions o Docker                        |
| `style`    | Cambios de formato sin impacto en lógica (prettier, lint) |
| `perf`     | Mejoras de rendimiento                                    |

### Scope

Usar el número de US o el módulo afectado:

```
feat(us01): implement JWT login endpoint with bcrypt verification
feat(us04): add unit conversion table to product form
fix(us07): prevent race condition in concurrent stock deduction
test(us25): add e2e test for credit sale without invoice rejection
refactor(stock): extract StockService.recordMovement to shared helper
chore(deps): upgrade TypeORM to 0.3.21
ci: add Docker build step to GitHub Actions workflow
docs: update sprint_plan.md with Sprint 8 task breakdown
```

### Reglas adicionales

- **Imperativo, minúsculas, sin punto final** en la descripción
- **Máximo 72 caracteres** en la primera línea
- Si el commit cierra una issue de GitHub: `Closes #42` en el footer
- **No usar** `git commit -m "fixes"`, `git commit -m "wip"`, `git commit -m "asdfgh"`

### Breaking Changes

Agregar `!` después del tipo o `BREAKING CHANGE:` en el footer:

```
feat(us46)!: rename SystemConfig.arca_punto_venta to arca_point_of_sale

BREAKING CHANGE: env var ARCA_PUNTO_VENTA renamed to ARCA_POINT_OF_SALE
```

---

## 4. Flujo de Trabajo Diario (Day-to-Day)

### Iniciar una nueva historia

```bash
# Siempre desde dev actualizado
git checkout dev
git pull origin dev

# Crear rama de feature
git checkout -b feat/s2-us06-stock-ledger
```

### Durante el desarrollo

```bash
# Commits frecuentes y atómicos (una cosa por commit)
git add src/modules/stock/
git commit -m "feat(us06): create StockMovement entity and TypeORM migration"

git add src/modules/stock/stock.service.ts
git commit -m "feat(us06): implement StockService.recordMovement with SELECT FOR UPDATE"

git add src/modules/stock/stock.service.spec.ts
git commit -m "test(us06): add unit tests for StockService.recordMovement edge cases"
```

### Sincronizar con `dev` si hay cambios (rebase, no merge)

```bash
# Mantener el historial lineal
git fetch origin
git rebase origin/dev

# Si hay conflictos, resolverlos y:
git rebase --continue
```

### Terminar la historia (merge a dev)

```bash
# Self-review checklist antes de mergear (ver sección 6)

# Opción A — desde la rama local (recomendado para mantener historial limpio)
git checkout dev
git merge --no-ff feat/s2-us06-stock-ledger -m "feat(us06): stock ledger engine with immutable movements and FOR UPDATE lock"
git push origin dev

# Eliminar la rama
git branch -d feat/s2-us06-stock-ledger
git push origin --delete feat/s2-us06-stock-ledger

# Opción B — PR en GitHub (útil para tener el link en el historial)
# Push de la rama → abrir PR a dev → CI pasa → self-merge → delete branch
```

> **Usar `--no-ff`** siempre al mergear features a `dev`. Preserva el contexto de qué commits pertenecían a qué historia.

### Release a `main` (al final de un milestone)

```bash
# Merge dev → main
git checkout main
git pull origin main
git merge --no-ff dev -m "release: Milestone 2 — Catalog + Stock + Suppliers + Purchases"
git push origin main

# Crear tag de versión
git tag -a v0.3.0 -m "Milestone 2: Catalog, Stock Engine, Suppliers, Importer, Purchases"
git push origin v0.3.0
```

### Hotfix en producción

```bash
# Desde main
git checkout main
git pull origin main
git checkout -b hotfix/arca-duplicate-cae

# ... fix ...
git commit -m "fix(us27): call FECompConsultar before retry to prevent duplicate CAE"

# Merge a main
git checkout main
git merge --no-ff hotfix/arca-duplicate-cae
git tag -a v0.8.1 -m "Hotfix: prevent duplicate CAE on ARCA retry"
git push origin main --tags

# Merge también a dev (no perder el fix)
git checkout dev
git merge --no-ff hotfix/arca-duplicate-cae
git push origin dev

# Limpiar
git branch -d hotfix/arca-duplicate-cae
git push origin --delete hotfix/arca-duplicate-cae
```

---

## 5. Estrategia de Versionado (SemVer pre-release)

```
v0.x.y  →  durante todo el desarrollo pre-MVP
v1.0.0  →  go-live (fin de Sprint 10, deploy a producción con cliente)
v1.x.y  →  mejoras post-MVP (fase 2)
```

### Tags por milestone

| Tag      | Milestone                | Sprint                    |
| -------- | ------------------------ | ------------------------- |
| `v0.1.0` | Infraestructura + Auth   | S0–S1                     |
| `v0.2.0` | Stock + Inventario       | S2                        |
| `v0.3.0` | Proveedores + Importador | S3                        |
| `v0.4.0` | Compras + Recepciones    | S4                        |
| `v0.5.0` | Facturas Prov. + Costos  | S5                        |
| `v0.6.0` | Precios + Clientes       | S6                        |
| `v0.7.0` | Punto de Venta           | S7                        |
| `v0.8.0` | ARCA integrado           | S8 — **Hito de pago #3**  |
| `v0.9.0` | Cta Cte + Cheques        | S9                        |
| `v1.0.0` | MVP completo — Go-Live   | S10 — **Hito de pago #4** |

Los tags de hito de pago corresponden a los 4 pagos del 25% acordados en el contrato.

---

## 6. Self-Review Checklist (antes de mergear a `dev`)

Dado que no hay otro developer para hacer code review, este checklist reemplaza la peer review:

```markdown
### Self-Review — feat/sN-usXX-descripcion

**Código**

- [ ] La lógica de negocio está en el Service, no en el Controller
- [ ] DTOs tienen validaciones con class-validator
- [ ] No hay console.log / debuggers olvidados
- [ ] Manejo de errores explícito (no swallow exceptions)
- [ ] SELECT FOR UPDATE usado donde hay concurrencia (operaciones de stock)
- [ ] Transacciones TypeORM con QueryRunner donde hay múltiples escrituras

**Tests**

- [ ] Tests unitarios del Service escritos y pasando
- [ ] Casos edge cubiertos (stock insuficiente, duplicados, valores negativos)
- [ ] `pnpm --filter backend run test` pasa localmente

**Frontend**

- [ ] Validación de formularios con Zod schema
- [ ] Estados de loading y error manejados en la UI
- [ ] Rol correcto requerido (ADMINISTRADOR vs VENDEDOR)

**General**

- [ ] Swagger actualizado (decoradores en Controller)
- [ ] Migración reversible (`typeorm migration:revert` no rompe nada)
- [ ] No hay secrets hardcodeados ni en .env committed
- [ ] CI pasa en la branch (verificar GitHub Actions antes de mergear)
```

---

## 7. GitHub Actions Workflows

### CI — `.github/workflows/ci.yml`

**Trigger:** Push a cualquier rama + PR a `dev` y `main`

```yaml
name: CI

on:
  push:
    branches-ignore:
      - main
  pull_request:
    branches: [dev, main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install --frozen-lockfile
      - run: pnpm -r run lint

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: erp_test
          POSTGRES_USER: erp_user
          POSTGRES_PASSWORD: erp_pass
        ports: ['5432:5432']
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter backend run test:cov
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_USER: erp_user
          DB_PASSWORD: erp_pass
          DB_NAME: erp_test
          JWT_SECRET: test-secret-ci
          REDIS_HOST: localhost
          REDIS_PORT: 6379
          ARCA_ENV: development

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter backend run build
      - run: pnpm --filter frontend run build
```

### CD — plan progresivo [#65](https://github.com/Benjalopezz27/erp-medico/issues/65)

CD todavía no está implementado. Se entregará mediante [#66](https://github.com/Benjalopezz27/erp-medico/issues/66), [#67](https://github.com/Benjalopezz27/erp-medico/issues/67) y [#71](https://github.com/Benjalopezz27/erp-medico/issues/71).

Flujo objetivo:

```text
CI verde
  → build multi-stage una sola vez
  → push backend/frontend a GHCR con commit SHA y digest
  → deploy del digest en staging
  → migraciones one-shot + smoke tests
  → aprobación manual de producción
  → promoción del mismo digest, sin rebuild
  → migraciones + smoke tests + monitoreo o rollback
```

Reglas:

- El VPS no ejecuta `git pull`, `pnpm install` ni builds.
- `staging` y `production` usan GitHub Environments y secrets independientes.
- Los deployments tienen concurrency control y registran SHA/digest.
- Producción requiere aprobación manual, backup previo y criterio de rollback.
- Ningún workflow contrata infraestructura, modifica DNS o carga certificados sin resolver los gates externos de su issue.

### Opcional — Lint de Markdown

**Trigger:** Push con cambios en `docs/`

```yaml
name: Lint Docs

on:
  push:
    paths: ['docs/**/*.md']

jobs:
  markdownlint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx markdownlint-cli2 "docs/**/*.md"
```

---

## 8. Configuración del Repositorio en GitHub

### Branch Protection Rules

**Para `main`:**

```
✓ Require a pull request before merging
✓ Require status checks to pass before merging
    - lint
    - test
    - build
✓ Require branches to be up to date before merging
✓ Do not allow bypassing the above settings
✗ Require approvals  (no other devs, self-review via checklist)
```

**Para `dev`:**

```
✓ Require status checks to pass before merging
    - lint
    - test
✗ Require a pull request  (puede mergear directamente en local)
```

### `.gitignore` recomendado

```gitignore
# Dependencies
node_modules/
.pnpm-store/

# Build outputs
dist/
build/
.next/

# Environment
.env
.env.local
.env.production
*.env

# Certificates (NUNCA commitear)
certs/
*.p12
*.pem
*.pfx

# Logs
*.log
logs/

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/settings.json
.idea/

# Test coverage
coverage/

# TypeORM
src/database/migrations/*.js
```

> ⚠️ **Crítico:** El archivo `.p12` del certificado ARCA **jamás** debe commitearse. Usar variables de entorno y secrets de GitHub/servidor.

---

## 9. Resumen Rápido

```
RAMA        PROPÓSITO               BASE        MERGE A
──────────────────────────────────────────────────────────
main        Producción              —           — (solo recibe)
dev         Staging / integración   main        main (milestone)
feat/*      Feature (1 por US)      dev         dev (fin de US)
fix/*       Bug no urgente          dev         dev
hotfix/*    Bug crítico en prod     main        main + dev
```

```
COMMIT FORMAT:  <tipo>(<us-scope>): <descripción imperativa>
EJEMPLOS:
  feat(us25): implement POS atomic transaction with stock deduction
  fix(us07): add pessimistic_write lock to prevent negative stock race
  test(us26): add mock ARCA integration test for CAE emission
  chore(deps): update bullmq to 5.12.0
```

```
VERSIONES:
  v0.1.0 → v0.9.0   desarrollo (pre-release)
  v1.0.0             go-live MVP
```
