# Railway production environment (single environment)

Railway runs a **single** environment, `production` (decision #283: the former
`staging` environment is renamed to `production`; there is no pre-deploy environment).
Because migrations run against real data, every deploy requires a restorable
backup first and a human approval. See [`go-live-checklist.md`](./go-live-checklist.md)
for the cutover and [`railway-operations-runbook.md`](./railway-operations-runbook.md)
for day-to-day operations.

## Target topology

```text
Internet
  |
  | HTTPS (*.up.railway.app)
  v
frontend (Nginx, public, port 8080)
  |
  | /api/v1 and /api/docs over Railway private networking
  v
backend (NestJS, private, backend.railway.internal:3000)
  |
  +-- PostgreSQL (managed service, private)
  |
  +-- Redis 7 (managed / private service, redis.railway.internal:6379)
  |     ^
  |     | BullMQ queues
  +-----+
  |
Worker (NestJS background worker, dist/worker.js, private)
```

## Deployment model

- All application services use the private GitHub repository as their source.
- Production tracks the `main` branch. `dev` does not deploy.
- Railway `Wait for CI` must be enabled for all services. A failed GitHub check
  therefore skips the corresponding deployment.
- Railway builds the existing production Dockerfiles from the repository root:
  - backend: `/apps/backend/Dockerfile` (CMD: `node dist/main.js`)
  - worker: `/apps/backend/Dockerfile` (CMD: `node dist/worker.js`)
  - frontend: `/apps/frontend/Dockerfile`
- The backend pre-deploy command is
  `node dist/database/run-migrations.js`. A non-zero exit blocks the release.
- Railway health checks gate activation of the new application deployment.
- GitHub Actions continues to build, scan, smoke-test, and publish immutable GHCR
  images as independent release evidence. Hobby deployments do not pull private
  GHCR images because private registry credentials require Railway Pro.

Railway auto-deploy from GitHub is disabled on backend, worker and frontend. The
`Deploy Railway` workflow (push to `main`, GitHub Environment `production` with
required reviewers) deploys them by commit SHA in order: backend, worker, frontend.
Afterwards `.github/workflows/verify-production.yml` verifies the deployed revision
without holding Railway credentials.

## Service configuration

Keep the source root at `/` for all services because this pnpm monorepo shares
root manifests and `packages/shared-types`.

### Backend

| Setting            | Value                                  |
| ------------------ | -------------------------------------- |
| Source branch      | `main`                                 |
| Dockerfile path    | `/apps/backend/Dockerfile`             |
| Public networking  | Disabled                               |
| Port               | `3000`                                 |
| Healthcheck        | `/api/v1/health`                       |
| Pre-deploy command | `node dist/database/run-migrations.js` |
| Restart policy     | On failure                             |

Required variables:

```text
NODE_ENV=production
PORT=3000
DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}
DB_USER=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}
DB_NAME=${{Postgres.PGDATABASE}}
REDIS_HOST=${{Redis.REDISHOST}}
REDIS_PORT=${{Redis.REDISPORT}}
REDIS_PASSWORD=${{Redis.REDISPASSWORD}}
JWT_SECRET=<unique random secret>
JWT_EXPIRATION=8h
ARCA_ENV=disabled
```

ARCA homologation (ARCA test service) is set per environment by a person, after the customer credentials gate. For real fiscal emission use `ARCA_ENV=production` per the Go-Live checklist:

```text
ARCA_ENV=homologation
ARCA_CUIT=<11-digit-authorized-cuit>
ARCA_PUNTO_VENTA=1
ARCA_CERT_BASE64=<sealed-base64-pkcs12-cert>
ARCA_CERT_PASSWORD=<sealed-cert-password>
ARCA_WSAA_URL=https://wsaahomo.afip.gov.ar/ws/services/LoginCms
```

### Worker (BullMQ Background Worker)

| Setting           | Value                        |
| ----------------- | ---------------------------- |
| Source branch     | `main`                       |
| Dockerfile path   | `/apps/backend/Dockerfile`   |
| Custom Start CMD  | `node dist/worker.js`        |
| Healthcheck CMD   | `node dist/worker-health.js` |
| Public networking | Disabled                     |
| Restart policy    | On failure                   |

Required variables:

```text
NODE_ENV=production
DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}
DB_USER=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}
DB_NAME=${{Postgres.PGDATABASE}}
REDIS_HOST=${{Redis.REDISHOST}}
REDIS_PORT=${{Redis.REDISPORT}}
REDIS_PASSWORD=${{Redis.REDISPASSWORD}}
JWT_SECRET=${{Backend.JWT_SECRET}}
JWT_EXPIRATION=8h
ARCA_ENV=disabled
```

### Frontend

| Setting           | Value                          |
| ----------------- | ------------------------------ |
| Source branch     | `main`                         |
| Dockerfile path   | `/apps/frontend/Dockerfile`    |
| Public networking | Railway-generated HTTPS domain |
| Port              | `8080`                         |
| Healthcheck       | `/`                            |
| Restart policy    | On failure                     |

Required variables:

```text
PORT=8080
BACKEND_HOST=backend.railway.internal
BACKEND_PORT=3000
```

The frontend uses a runtime Nginx template, so Docker Compose continues to use
the default hostname `backend`, while Railway can select its private DNS name
without rebuilding the SPA or exposing the API publicly.

## Security and data boundaries

1. Do not enable a public domain or TCP proxy for backend or PostgreSQL.
2. There is no environment to test migrations on: test them locally or in an
   ephemeral PR environment, and take a restorable backup before every deploy.
3. Never reuse `JWT_SECRET`, database credentials or ARCA credentials from local
   development or from any removed environment.
4. Never copy production data to local or other environments.
5. Keep `ARCA_ENV=disabled` until the corresponding ARCA integration is explicitly
   approved for production.
6. Use the Railway domain until the custom domain gate is approved.

## Verification

After Railway reports both services healthy, run `Verify Railway Production` from
GitHub Actions with the frontend HTTPS origin and deployed commit SHA. It checks:

- HTTPS and HTTP-to-HTTPS redirect;
- backend and database health through the same-origin proxy;
- backend and frontend commit metadata;
- SPA route fallback;
- absence of a public PostgreSQL port on the frontend hostname.

Railway health checks are deployment readiness gates, not continuous monitoring.
Review deployment logs and metrics after every first-time configuration change.

## Activation status

Prepared in code does not mean cut over. The state of each Go-Live gate and the
cutover sequence live in [`go-live-checklist.md`](./go-live-checklist.md).
