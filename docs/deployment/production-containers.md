# Production Containerization & Deployment Guide

This document outlines the container architecture, security model, local standalone execution, and automated CI/CD pipeline for the `erp-medico` production container stack.

---

## 1. Architecture & Security Topology

```
+-------------------------------------------------------------------------+
|                               HOST MACHINE                              |
|                                                                         |
|   +-----------------------------------------------------------------+   |
|   |  EDGE NETWORK (Bridge)                                          |   |
|   |                                                                 |   |
|   |   +---------------------------------------------------------+   |   |
|   |   | Frontend Container (Nginx Unprivileged - Port 8080)     |   |   |
|   |   | - Non-root user: nginx (UID 101)                        |   |   |
|   |   | - Serves React 19 SPA + Immutable hashed assets         |   |   |
|   |   | - Reverse proxy: /api/v1/ -> http://backend:3000        |   |   |
|   |   +----------------------------+----------------------------+   |   |
|   +--------------------------------|--------------------------------+   |
|                                    | (Internal only)                    |
|   +--------------------------------|--------------------------------+   |
|   |  APP NETWORK (Private Internal Bridge)                          |   |
|   |                                v                                |   |
|   |   +---------------------------------------------------------+   |   |
|   |   | Backend API (NestJS - Port 3000)                        |   |   |
|   |   | - Non-root user: appuser (UID 10001)                    |   |   |
|   |   | - PID 1: Tini signal handler                            |   |   |
|   |   | - Zero host ports exposed                               |   |   |
|   |   +--------------------+-------------------+----------------+   |   |
|   |                        |                   |                    |   |
|   |                        v                   v                    |   |
|   |   +------------------------+   +------------------------+       |   |
|   |   | PostgreSQL 16 Alpine   |   | Redis 7.4 Alpine       |       |   |
|   |   | - Zero host ports      |   | - Zero host ports      |       |   |
|   |   | - Persistent volume    |   | - Persistent volume    |       |   |
|   |   +------------------------+   +------------------------+       |   |
|   +-----------------------------------------------------------------+   |
+-------------------------------------------------------------------------+
```

### Security Invariants

- **Non-Root Execution**:
  - Backend runs as `appuser:appgroup` (UID `10001:10001`).
  - Frontend runs as `nginx:nginx` (UID `101:101`).
- **Network Segmentation**:
  - Only the `frontend` container exposes a port to the host (`8080`).
  - `backend`, `postgres`, and `redis` communicate exclusively over the internal `app` network.
  - Databases have **zero host port bindings**.
- **Same-Origin Reverse Proxy**:
  - The SPA makes API requests to `/api/v1` on the same origin (`localhost:8080/api/v1`).
  - Nginx forwards `/api/v1/` directly to `http://backend:3000`.
  - No backend hosts or API URLs are hardcoded into compiled JS bundles.
- **Fail-Closed Fiscal Integration**:
  - The production stack forces `ARCA_ENV=disabled` until Sprint 8; host variables cannot enable the incomplete integration.
  - Any fiscal invoice generation attempt fails closed with a `ServiceUnavailableException`.

---

## 2. Local Production Stack Execution

### Prerequisites

- Docker Engine $\ge 24.0$ with Compose V2.
- Clean working tree.

### Starting the Stack

```bash
# 1. Copy the production environment template
cp .env.prod.example .env.prod

# 2. Generate unique local secrets and place them in .env.prod
openssl rand -hex 24   # DB_PASSWORD
openssl rand -base64 48 # JWT_SECRET

# 3. Build local test container images (or use immutable GHCR tags)
docker build -t erp-medico-backend:test -f apps/backend/Dockerfile .
docker build -t erp-medico-frontend:test -f apps/frontend/Dockerfile .

# 4. Start the stack in detached mode
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

The template intentionally leaves secrets empty, and Compose refuses to start until they are set. Image metadata (`APP_VERSION` and `APP_COMMIT_SHA`) is baked at build time and cannot be overridden by the runtime environment.

### Automatic Startup Sequence

1. `postgres` and `redis` start and undergo health checks (`pg_isready`, `redis-cli ping`).
2. `migration` executes compiled TypeORM migrations (`dist/database/data-source.js`) and terminates with exit code `0`.
3. `backend` starts only after `migration` completes successfully.
4. `frontend` starts and opens port `8080` once `backend` reports healthy (`/api/v1/health`).

---

## 3. Operations & Maintenance

### Running Migrations Manually

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm migration
```

### Inspecting Logs

```bash
# Stream all logs
docker compose -f docker-compose.prod.yml logs -f

# Inspect backend logs
docker compose -f docker-compose.prod.yml logs -f backend
```

### Checking System Health & Version

```bash
# Backend Health Endpoint (via Nginx proxy)
curl -i http://localhost:8080/api/v1/health

# Frontend Version File
curl -i http://localhost:8080/version.json
```

### Graceful Teardown

```bash
# Stop containers (preserves database and redis volumes)
docker compose -f docker-compose.prod.yml --env-file .env.prod down

# Full teardown including volumes (for test cleanup only)
docker compose -f docker-compose.prod.yml --env-file .env.prod down -v
```

---

## 4. CI/CD & Container Publication Pipelines

The automated CI/CD lifecycle is split into two specialized workflows:

### A. Continuous Integration (`.github/workflows/ci.yml`)

Runs on all pull requests and branch pushes:

1. **Lint & Code Style**: Prettier and ESLint across all packages.
2. **Backend & Frontend Tests**: Unit, integration, E2E tests, and code coverage.
3. **Workspace Build**: Type checking and compilation of all packages with Node 24.

### B. Container Image Publication (`.github/workflows/publish-images.yml`)

Triggered automatically via `workflow_run` upon successful CI completion on `dev` and `main`:

1. **Container Build**: Multi-stage Docker image builds with BuildKit caching.
2. **Security Scanning**:
   - Trivy vulnerability scanner on both images with `exit-code: 1` on `CRITICAL,HIGH` CVEs.
   - Repository scan for committed secrets and unsafe configurations.
3. **Automated Compose Smoke Test**: Boots stack in isolated namespace (`-p erp_ci_smoke`), runs one-shot migrations, verifies non-root execution, and validates health.
4. **Publication to GHCR**:
   - Pushes immutable tag `sha-<full_commit_sha>`.
   - Pushes floating branch tag (`dev` or `latest`) as convenience alias.
   - Extracts immutable digests (`image@sha256:<digest>`).
   - Generates and uploads `release-manifest.json` as release evidence.

Railway Hobby staging builds these same Dockerfiles from the private GitHub
repository after CI succeeds. It does not consume private GHCR images because
Railway reserves private registry credentials for its Pro plan. See
[`staging-environment.md`](./staging-environment.md) for the provider-specific
deployment model and the external steps that remain intentionally unprovisioned.

---

## 5. Recorded Delivery Decisions

| Concern             | Decision                                                                                                                                                                                                                         |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registry            | GitHub Container Registry (GHCR), using `ghcr.io/benjalopezz27/erp-medico-backend` and `ghcr.io/benjalopezz27/erp-medico-frontend`.                                                                                              |
| Visibility          | Packages remain private initially. Public visibility requires an explicit repository-owner decision; no deployment depends on it yet.                                                                                            |
| Web server          | Nginx runs inside the frontend image so the artifact includes the exact SPA and proxy configuration that was tested.                                                                                                             |
| Target architecture | The first server target is Linux `amd64`. The Dockerfiles are architecture-neutral; multi-platform publication can be added when an `arm64` target exists.                                                                       |
| Image retention     | Keep deployed digests and the most recent 30 immutable SHA tags per environment. Floating `dev` and `latest` tags are convenience aliases and are never deployment identities. Cleanup automation belongs to the later CD issue. |

Production image references should use `image@sha256:<digest>`, not a floating tag. The CI summary records the digest produced for each commit.

---

## 6. Troubleshooting

- **Compose reports a required variable is missing**: populate `DB_PASSWORD` and `JWT_SECRET` in `.env.prod`; intentionally empty values are rejected.
- **The migration container exits non-zero**: inspect `docker compose --env-file .env.prod -f docker-compose.prod.yml logs migration`. The backend will not start after a failed migration.
- **Health returns HTTP 503**: inspect backend and PostgreSQL health/logs. A degraded database check deliberately produces 503.
- **ARCA configuration is rejected**: the production stack forces `ARCA_ENV=disabled` until the real integration is implemented. It cannot be enabled with a host environment variable.
- **A private GHCR image cannot be pulled**: authenticate with a token that has `read:packages`; do not place the token in `.env.prod` or Compose files.
- **A port is already in use**: change `FRONTEND_PORT` in `.env.prod`. PostgreSQL, Redis, and the backend intentionally have no host port mapping.
