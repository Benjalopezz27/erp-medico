# Tasks

## 1. Workflows y smoke

- [x] 1.1 `deploy-railway.yml`: `on.push.branches: [main]`, `environment: production` fijo, ajustar comentarios, agregar resumen en `$GITHUB_STEP_SUMMARY` con el recordatorio de backup previo. Verificar con `grep -n "staging\|dev" .github/workflows/deploy-railway.yml` (sin coincidencias de entorno) y `actionlint` si está disponible.
- [x] 1.2 `git mv .github/workflows/verify-staging.yml .github/workflows/verify-production.yml`; name `Verify Railway Production`, input `production_url`, environment `production`, concurrency `verify-railway-production`. Verificar lectura del YAML.
- [x] 1.3 `git mv scripts/smoke-test-staging.sh scripts/smoke-test-production.sh`; renombrar variables y textos; mantener permisos de ejecución. Verificar `bash -n` y `shellcheck` si está disponible.

## 2. Documentación de contexto y flujo

- [x] 2.1 `AGENTS.md` §3, §4, §6, §8: entorno único Railway, flujo `dev → main`, homologación ARCA distinta del entorno. Verificar que no queda `staging` como entorno.
- [x] 2.2 `docs/git_workflow.md` (líneas ~44, ~384, ~489), `docs/RUNBOOK.md` (líneas ~15, ~25, ~52), `README.md`, `.asome/config.json` (`deploy._note`): reflejar `dev → main`.
- [x] 2.3 `docs/qa-regression.md`, `docs/sprint_plan.md`, `docs/tech_stack.md`, `docs/mvp_backlog.md`, `docs/project_proposal_and_budget.md`, `docs/README.md`, `docs/product/long-lead.md`: ajustar solo menciones del entorno/flujo; no reescribir contenido histórico de planificación.
- [x] 2.4 `.env.example`, `.env.railway.backend.example`, `ops/backup/.env.example` (`BACKUP_ENV=production`): quitar referencias a staging como entorno. `.gitignore`/`.dockerignore`: dejar `.env.staging` ignorado por seguridad (no se quita).

## 3. Runbooks y checklist

- [x] 3.1 `git mv docs/deployment/staging-environment.md docs/deployment/production-environment.md`; reescribir encabezado y secciones a entorno único con su riesgo; corregir enlaces entrantes (`docs/RUNBOOK.md`, `docs/deployment/production-containers.md`).
- [x] 3.2 `docs/deployment/railway-operations-runbook.md`: renombrar pasos (`Verify Railway Production`), añadir "backup restaurable antes de cada deploy con migraciones", "migraciones probadas en local o entorno efímero" y sección de rollback de aplicación y de datos. Actualizar `backup-restore-runbook.md` §8.2 y checklist (líneas ~60, ~64, ~136-142, ~173).
- [x] 3.3 Crear `docs/deployment/go-live-checklist.md`: tabla de gates externos de #71 (estado `PENDIENTE`, responsable, fecha), secuencia de cutover (verificar vacío el `production` viejo, backup restaurable de `staging`, borrar, renombrar, rama `main`, token y reviewers, dominios/TLS, variables y `ARCA_ENV`, certificado ARCA), criterios de éxito/rollback, smoke tests, release `v1.0.0` y handoff. Sin secretos. Enlazarlo desde `docs/RUNBOOK.md` y `docs/README.md`.

## 4. Verificación

- [x] 4.1 `grep -rIni staging --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=archive --exclude-dir=evidence .` revisado: solo quedan menciones intencionales (`.gitignore`/`.dockerignore`, `.gitleaks.toml`, specs de otros changes, histórico de planificación).
- [x] 4.2 `pnpm run format:check && pnpm -r run lint && pnpm test && pnpm build` en verde. `openspec validate railway-single-env-production` sin errores.
- [ ] 4.3 PR a `dev` con `Closes #283`; en #71 solo `Refs #71` (no cierra: faltan gates y Go-Live). Rama `feat/devops-production-go-live`.
