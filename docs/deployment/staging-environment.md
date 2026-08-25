# Railway staging environment

This repository is prepared for an isolated Railway staging environment. The
external project, services, variables, domains, and billing limits are not
provisioned by this change and must be configured by the repository owner before
the first deployment.

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
  | Railway private networking
  v
PostgreSQL (managed service, no public TCP proxy)
```

Redis is intentionally omitted until the application has a runtime dependency
on it. Adding an unused persistent service increases cost and operational scope.

## Deployment model

- Both application services use the private GitHub repository as their source.
- Staging tracks the `dev` branch.
- Railway `Wait for CI` must be enabled for both services. A failed GitHub check
  therefore skips the corresponding deployment.
- Railway builds the existing production Dockerfiles from the repository root:
  - backend: `/apps/backend/Dockerfile`
  - frontend: `/apps/frontend/Dockerfile`
- The backend pre-deploy command is
  `node dist/database/run-migrations.js`. A non-zero exit blocks the release.
- Railway health checks gate activation of the new application deployment.
- GitHub Actions continues to build, scan, smoke-test, and publish immutable GHCR
  images as independent release evidence. Hobby deployments do not pull private
  GHCR images because private registry credentials require Railway Pro.

No automatic Railway deployment workflow is committed: repository connection,
`Wait for CI`, service settings, and the first deployment require owner actions in
the Railway dashboard. After provisioning, `.github/workflows/verify-staging.yml`
can verify an externally deployed revision without holding Railway credentials.

## Service configuration

Keep the source root at `/` for both services because this pnpm monorepo shares
root manifests and `packages/shared-types`.

### Backend

| Setting            | Value                                  |
| ------------------ | -------------------------------------- |
| Source branch      | `dev`                                  |
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
JWT_SECRET=<unique random secret>
JWT_EXPIRATION=8h
ARCA_ENV=disabled
```

### Frontend

| Setting           | Value                          |
| ----------------- | ------------------------------ |
| Source branch     | `dev`                          |
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
2. Keep staging and production in separate persistent Railway environments.
3. Never reuse `JWT_SECRET`, database credentials, or future ARCA credentials.
4. Staging accepts synthetic fixtures only. Never restore a production dump.
5. Keep `ARCA_ENV=disabled` until the homologation integration is explicitly
   implemented and approved.
6. Generate a Railway domain for staging; reserve the purchased custom domain for
   the future production frontend.

## Verification

After Railway reports both services healthy, run `Verify Railway Staging` from
GitHub Actions with the frontend HTTPS origin and deployed commit SHA. It checks:

- HTTPS and HTTP-to-HTTPS redirect;
- backend and database health through the same-origin proxy;
- backend and frontend commit metadata;
- SPA route fallback;
- absence of a public PostgreSQL port on the frontend hostname.

Railway health checks are deployment readiness gates, not continuous monitoring.
Review deployment logs and metrics after every first-time configuration change.

## Activation status

Prepared in code does not mean provisioned. Until the owner completes the linked
operations issue, staging has no Railway project, service, domain, secrets, data,
or running deployment.
