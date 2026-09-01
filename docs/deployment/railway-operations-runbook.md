# Railway operations runbook

This runbook starts after the repository owner provisions Railway. It provides operational instructions for deployment, health check diagnostics, structured log tracing, rate limiting triage, and incident response.

---

## 1. First deployment

1. Confirm CI is green for the selected `dev` commit.
2. Confirm backend, frontend, and PostgreSQL belong to the `staging` environment.
3. Confirm only frontend has public networking.
4. Review staged Railway configuration and variables without exposing values.
5. Deploy PostgreSQL, then backend, then frontend.
6. Confirm the backend pre-deploy migration exits successfully.
7. Confirm both application health checks pass (`/api/v1/health/ready` or `/api/v1/health`).
8. Run the `Verify Railway Staging` GitHub workflow with the exact commit SHA.
9. Record the deployment URL, SHA, timestamp, and smoke result in the operations issue. Do not record secrets.

---

## 2. Observability & Structured Log Tracing

The backend emits newline-delimited JSON (NDJSON) logs directly to stdout/stderr. Every log record includes:

- `timestamp`: ISO 8601 UTC timestamp
- `level`: `info`, `warn`, `error`, `debug`
- `context`: NestJS logger context (e.g. `HTTP`, `AuthService`, `HealthService`)
- `message`: Sanitized message or object (`[REDACTED]` for any credential/key)
- `requestId`: Distributed trace UUID from `X-Request-ID`
- `userId`: Authenticated user ID (if available)
- `environment`, `version`, `commitSha`

### Searching Logs by Request ID

When a user or frontend reports an error:

1. Obtain the `requestId` from the HTTP error response payload or `X-Request-ID` response header.
2. In Railway Dashboard -> Backend -> **Deploy Logs**, filter for the `requestId`:
   ```bash
   grep "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
   ```
3. Locate the corresponding `HTTP_REQUEST` or `HTTP_REQUEST_ERROR` entry with `statusCode` and `durationMs`.

---

## 3. Health Check Diagnostics & Triage

The backend exposes decoupled health probes:

- `GET /api/v1/health/live`: Liveness check. Returns HTTP 200 if the Node.js event loop is running. Does not query the database.
- `GET /api/v1/health/ready`: Readiness check. Queries `SELECT 1` against PostgreSQL. Returns HTTP 200 when ready, or HTTP 503 when degraded.
- `GET /api/v1/health`: Backward-compatible alias for readiness.

### Diagnosing Readiness Failure (HTTP 503)

If `/api/v1/health/ready` returns 503:

1. The response JSON will indicate `"status": "degraded"` and `"services": { "database": "down" }`.
2. Check PostgreSQL service status in Railway.
3. Check Railway backend logs for `[HealthService] Database health check failed`.
4. Verify Railway database environment variables (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`).

### Diagnosing Liveness Failure (Process Not Responding)

If `/api/v1/health/live` times out or fails:

1. The Node.js process is likely blocked, out of memory (OOMKilled), or crashed.
2. Check Railway metrics for CPU/RAM saturation.
3. Review standard error logs in Railway for unhandled fatal errors or memory crashes.

---

## 4. Rate Limiting (HTTP 429) Investigation

The API enforces in-memory rate limiting via `@nestjs/throttler`:

- Global limit: 120 requests per 60 seconds per IP.
- Login endpoint (`POST /api/v1/auth/login`): 5 attempts per 60 seconds per IP.
- Health checks (`/api/v1/health/*`): `@SkipThrottle()` (exempt from throttling).

### Investigating 429 Too Many Requests

1. If legitimate users experience 429s, inspect `TRUST_PROXY_HOPS` in `.env.railway.backend`.
   - Behind Railway Ingress + Nginx, ensure `TRUST_PROXY_HOPS=2` so client IP is extracted from `X-Forwarded-For` rather than sharing Nginx internal IP.
2. Note: Because rate limiting is in-memory for the single-container stack, rate limiter counters reset to zero upon any container restart.
3. If horizontal scaling is added in the future, migrate storage to Redis to coordinate limits across replicas.

---

## 5. Failed deployment

- A failed migration must leave the new backend deployment inactive. Inspect the pre-deploy logs and fix the migration; never bypass it by starting the API manually.
- A failed health check must leave the prior healthy deployment serving traffic. Review `PORT`, database references, application logs, and the health response.
- A frontend `502` for `/api/v1` usually means `BACKEND_HOST` is incorrect or the backend is unhealthy inside the same Railway environment.

---

## 6. Rollback drill

1. Select the previous known-good deployment in Railway.
2. Use Railway's rollback action and wait for its health check.
3. Run the external smoke workflow against the rolled-back commit SHA.
4. Record the result in the operations issue.

An application rollback does not undo a database migration. Migrations must remain backward compatible with the prior application until a release is proven stable. For destructive schema work, use an expand-and-contract migration sequence.

---

## 7. Cost controls

- Enable serverless sleeping for staging frontend and backend if cold starts are acceptable.
- Set a billing email alert before enabling the services.
- A hard usage limit takes workloads offline. Use it only with a deliberate amount and never treat it as an availability feature.
- Review estimated usage after one week before provisioning production.

---

## 8. Incident Checklist & Compromised Secret Rotation

If a secret or credential is suspected to be compromised:

1. **JWT Secret**: Update `JWT_SECRET` in Railway dashboard and redeploy. All active sessions will be invalidated immediately.
2. **Database Password**: Update PostgreSQL password, update backend `DB_PASSWORD`, and redeploy backend.
3. **ARCA Certificate / Password**:
   - Immediately revoke compromised certificate in AFIP / ARCA portal if necessary.
   - Generate new CSR / download new X.509 PKCS#12 certificate.
   - Encode new certificate as Base64: `base64 -w 0 new_cert.p12 > cert_base64.txt`.
   - Update `ARCA_CERT_BASE64` and `ARCA_CERT_PASSWORD` in Railway staging variables.
   - Trigger redeploy of backend and worker services.
   - Never commit or paste raw certificate files in Git or logs.
4. **Audit Snapshot Integrity**: Confirm that audit logs did not store compromised keys (verified by automated `stripSensitiveKeys`).

---

## 9. Phase B: External Monitoring & Alerting (Deferred to #114)

When the repository owner provisions Railway staging in **Issue #114**, the following will be validated:

1. External uptime monitor configured against `https://<staging-url>/api/v1/health/ready`.
2. Notification channel (Slack webhook, Telegram, or email).
3. Controlled staging drill:
   - Query `/api/v1/health/ready` (expect 200).
   - Temporarily pause database or test non-prod service.
   - Verify external alert is received in the approved channel.
   - Restore service and verify recovery notification.
   - Document timings in the operations issue and close #68.

---

## 10. ARCA Certificate Lifecycle & Expiration Monitoring

ARCA homologation and production X.509 certificates expire after 1 to 2 years.

### Inspecting Certificate Status (Without Exposing Secrets)

1. Authenticate as `ADMINISTRADOR` and invoke diagnostic probe:
   ```bash
   GET /api/v1/arca/probe
   ```
2. The endpoint returns sanitized metadata:
   - `certificate.subject`
   - `certificate.validTo`
   - `certificate.daysRemaining`
   - `certificate.isExpired`
3. If `daysRemaining < 30`, schedule rotation before expiration.

### Routine Certificate Rotation Procedure

1. Request renewed certificate from client AFIP delegate.
2. Convert PKCS#12 (.p12) to Base64 in local secure terminal:
   ```bash
   base64 -w 0 homo_cert_2027.p12 > /tmp/cert_b64.txt
   ```
3. Update `ARCA_CERT_BASE64` and `ARCA_CERT_PASSWORD` in Railway variables as sealed values.
4. Restart backend and worker services.
5. Verify `GET /api/v1/arca/probe` reports updated expiration date and healthy WSAA authentication.

---

## 11. ARCA Clock Drift Triage & Time Synchronization

AFIP WSAA rejects authentication requests if the server clock drifts from official AFIP time by more than ~600 seconds (and issues warnings above 60s).

### Diagnosing Clock Drift

1. Railway containers run on managed host VMs; container NTP daemon cannot modify host clock.
2. Check `GET /api/v1/arca/probe` output:
   - Inspect `clockSync.driftSeconds` and `clockSync.isSynchronized`.
3. If `isSynchronized: false` (drift > 60s):
   - Check Railway system status page for host node clock skew.
   - Restart container instance to migrate to a synchronized Railway worker node.

---

## 12. BullMQ Worker & Redis Queue Operations

### Worker Health & Restart Recovery

1. The background worker runs as a standalone process via `node dist/worker.js`.
2. Job persistence is backed by Redis 7. If the worker process restarts:
   - In-flight jobs are recovered or retried based on BullMQ lock expiration.
   - Completed and failed jobs are retained up to configured limits for telemetry.
3. To verify worker processing, trigger an `ops-probe` test job via internal queue dispatcher.
