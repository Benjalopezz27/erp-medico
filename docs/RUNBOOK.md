# Runbook — erp-medico

> Manual §12.2. Mandatorio para todo lo que corre en producción.

## Arquitectura en resumen

Monorepo pnpm (`apps/backend` NestJS+TypeORM, `apps/frontend` React+Vite,
`packages/shared-types`). PostgreSQL 16 + Redis 7 (BullMQ) locales vía Docker Compose en
desarrollo. Deploy en Railway: frontend (Nginx, público) → backend (NestJS, privado,
`backend.railway.internal:3000`) → PostgreSQL y Redis (managed, privados). Worker BullMQ
separado (`dist/worker.js`) para jobs asíncronos (emisión fiscal ARCA, PDF, reintentos).

Detalle completo, topología y variables por ambiente:

- [`docs/deployment/staging-environment.md`](deployment/staging-environment.md) — topología
  Railway de staging.
- [`docs/deployment/production-containers.md`](deployment/production-containers.md) — imágenes
  productivas reproducibles (`docker-compose.prod.yml`).
- [`docs/deployment/railway-operations-runbook.md`](deployment/railway-operations-runbook.md) —
  operación día a día en Railway (deploys, rollback, logs, variables).

## Entornos

- **Development** — local, Docker Compose (`docker-compose.yml`), `ArcaMockService` para fiscal.
- **Staging** — Railway, no es una rama git (no existe `staging` en el remoto). Homologación
  AFIP/ARCA real (`ArcaHomologationService`), certificado `.p12` de homologación.
- **Production** — rama `main`, `docker-compose.prod.yml` como referencia de imágenes.
  Certificado y CUIT de producción: <<HUECO M-05>> — no confirmados en este bootstrap.

## Cómo deployar / rollback

Ver [`docs/deployment/railway-operations-runbook.md`](deployment/railway-operations-runbook.md).
No usar el MCP `railway` para ejecutar un deploy o revertirlo — ver tabla de servidores MCP en
`AGENTS.md` §7: ese servidor está limitado a solo lectura en este repo, cualquier acción de
escritura la ejecuta una persona desde la consola o CLI de Railway directamente.

## Incidentes conocidos / puntos frágiles

- Integración ARCA/AFIP (WSAA/WSFE) es el punto de falla con mayor impacto: un fallo pre-CAE deja
  la venta `CONFIRMADA` con `FiscalDocument=PENDIENTE_FACTURACION` (reintento automático vía
  BullMQ); un fallo post-CAE se reconcilia con `FECompConsultar` antes de reintentar
  `FECAESolicitar` — ver Sprint 8 (#9, #224, #226).
- Sin rama `staging` en git: cualquier automatización que asuma la cadena `dev → staging → main`
  no aplica acá tal cual — ver `.asome/config.json`.

<<HUECO M-06>> — procedimiento de rotación del certificado `.p12` y responsable, pendiente de
confirmación con el cliente (ver también #69).
