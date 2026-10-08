# Proposal

## Why

La issue #71 (Go-Live) asumía un VPS propio, pero la infraestructura real vive en Railway. Por el volumen de uso (~0,3 GB de RAM, ~USD 3/mes) no se justifica mantener `staging` y `production` por separado. La issue #283 decide un único entorno productivo en Railway, partiendo del `staging` actual (que ya tiene la prueba con datos reales de #265). El repo todavía asume la cadena `dev → staging → main`, con un ternario `staging`/`production` en el workflow de deploy y docs que hablan de staging como destino de prueba previo.

## What Changes

Solo lado repo y documentación. Nada de este cambio toca Railway, DNS ni datos reales; el cutover lo ejecuta una persona (AGENTS §6, §8).

- `deploy-railway.yml`: despliega **solo desde `main`**, con el GitHub Environment `production` (aprobación manual requerida). Un push a `dev` deja de desplegar.
- Renombrar `verify-staging.yml` → `verify-production.yml` y `scripts/smoke-test-staging.sh` → `scripts/smoke-test-production.sh`, con environment `production`.
- Renombrar `docs/deployment/staging-environment.md` → `docs/deployment/production-environment.md` y adaptarlo a entorno único.
- Actualizar `AGENTS.md`, `docs/git_workflow.md`, `docs/RUNBOOK.md`, `.asome/config.json`, `README.md`, ejemplos `.env*` y `ops/backup/.env.example` (`BACKUP_ENV`) para reflejar `dev → main` y un único entorno.
- Runbooks: backup obligatorio antes de cada deploy (las migraciones corren contra datos reales), migraciones probadas en local o en entorno efímero, y procedimiento de rollback.
- Nuevo `docs/deployment/go-live-checklist.md`: gates externos de #71 con estado, secuencia de cutover (borrar `production` viejo, renombrar `staging`, mover rama de deploy, dominios/TLS/variables/cert ARCA), criterios de éxito/rollback y smoke tests.
- **BREAKING (proceso):** desaparece el entorno previo al deploy; `/asome-deploy` pasa de `dev → staging → main` a `dev → main`.

**Fuera de alcance:** ejecutar cualquier acción en Railway/GitHub Environments, borrar el `production` actual, mover dominios, cargar el certificado ARCA, crear el tag `v1.0.0`; modificar `ci.yml`/`publish-images.yml`; cambios de aplicación o migraciones.

## Capabilities

### New Capabilities

- `operations/production-environment`: entorno único Railway, flujo de promoción `dev → main`, deploy con aprobación, verificación externa y gates/checklist de Go-Live.

### Modified Capabilities

(ninguna — `openspec/specs/operations/` no tiene capacidades de entorno)

## Impact

- Workflows: `.github/workflows/deploy-railway.yml`, `verify-staging.yml` → `verify-production.yml`.
- Scripts: `scripts/smoke-test-staging.sh` → `scripts/smoke-test-production.sh`.
- Docs/config: `AGENTS.md`, `README.md`, `.asome/config.json`, `docs/{git_workflow,RUNBOOK,qa-regression,sprint_plan,tech_stack}.md`, `docs/deployment/*`, `.env*.example`, `.gitignore`/`.dockerignore` (`.env.staging`).
- Sistemas externos (acciones humanas, no de este cambio): Railway, GitHub Environments (`staging` se elimina, `production` con reviewers), DNS.
- Riesgo: sin entorno previo, un deploy defectuoso afecta datos reales; mitigado con backup previo, aprobación manual y rollback documentado.
