# Design

## Context

Hoy `deploy-railway.yml` dispara en push a `dev` y `main` y elige environment con `github.ref_name == 'main' && 'production' || 'staging'`. `ops/railway/deploy-service.sh` es agnóstico: despliega por SHA con el `RAILWAY_TOKEN` del entorno (project token ligado a un environment). Railway Hobby construye los Dockerfiles del repo desde GitHub; el auto-deploy está desactivado y el workflow despliega por SHA. Hay ~40 archivos con la palabra `staging` (workflows, script de smoke, AGENTS, docs, ejemplos de env, runbooks, specs archivadas/en curso).

## Goals / Non-Goals

**Goals:** repo coherente con un único entorno `production` y flujo `dev → main`; deploy solo desde `main` con aprobación; checklist de Go-Live auditable.
**Non-Goals:** acciones en Railway/GitHub/DNS, cambios de app o migraciones, `ci.yml`/`publish-images.yml`, reescribir historia (specs archivadas y evidencias fechadas no se tocan).

## Decisions

1. **Deploy solo en `main`** (decidido con el owner). `on.push.branches: [main]`; `environment: production` fijo. La aprobación manual vive en la protección del Environment `production` (required reviewers), configurada por una persona; el workflow la documenta pero no puede forzarla. Alternativa descartada: mantener deploy desde `dev` al entorno único, porque cada merge a `dev` tocaría datos reales sin aprobación.
2. **Renombrar en lugar de parametrizar** `verify-staging` → `verify-production` y el script de smoke. Es 1:1 y evita nombres engañosos; `git mv` conserva historia. Inputs `staging_url` → `production_url`.
3. **`docs/deployment/staging-environment.md` → `production-environment.md`** con `git mv`; se corrigen los enlaces entrantes (`RUNBOOK.md`, `production-containers.md`). Se conserva la topología; se agrega la sección de entorno único y su riesgo.
4. **Texto sobre homologación ARCA**: `ArcaHomologationService`/"staging/homologación" en AGENTS §8 se refiere al ambiente de pruebas de ARCA, no al entorno Railway. Se reescribe como "homologación ARCA" para no confundir; `ARCA_ENV` en producción lo fija una persona en Railway.
5. **Backup previo en el runbook, no en el workflow.** El backup ya es un servicio de `ops/backup` bloqueado por gates externos; el workflow no puede ejecutarlo. Se añade un paso obligatorio en runbook + checklist, y se deja un recordatorio en el resumen del job (`$GITHUB_STEP_SUMMARY`) para quien aprueba. Sin lógica nueva en CI.
6. **Checklist de Go-Live** como doc con tabla de gates (mismo patrón que `backup-gates.md`), estado `PENDIENTE`, sin secretos.
7. **No se tocan** `openspec/changes/archive/**`, `docs/deployment/evidence/**` ni `.gitleaks.toml` (referencia histórica a un commit). Specs de otros changes en curso que mencionen staging se dejan; se listan en tasks para revisión puntual solo si contradicen el flujo.

## Risks / Trade-offs

- Sin entorno previo, migraciones corren sobre datos reales → backup obligatorio, probar en local/efímero, rollback documentado.
- La aprobación manual depende de configuración externa → tarea humana explícita en el checklist; verificable en Settings → Environments.
- Renombres rompen enlaces → grep final sin `staging` residual (salvo excepciones de la decisión 7) y `pnpm run format:check`.
- Si el nombre del environment cambia, el `RAILWAY_TOKEN` de `production` debe ser el del entorno renombrado, no el del `production` borrado → paso explícito en cutover.

## Migration Plan

1. Mergear este change a `dev` (sin efecto en Railway: `dev` ya no despliega).
2. Persona ejecuta el cutover de `go-live-checklist.md` (backup, borrar `production` viejo, renombrar `staging`, rama de deploy `main`, token/reviewers, dominios, variables).
3. Promover `dev → main` con `/asome-deploy`; aprobar deploy; smoke con `Verify Railway Production`.
   Rollback: ver checklist (redeploy SHA anterior; restore del backup previo).

## Open Questions

Ninguna bloqueante. Gates externos de #71 quedan `PENDIENTE` en el checklist.
