# Startup Checklist for ERP Distribuidora Médica

## 1. Repository & Project Scaffold

| Item                                                                    | Why it’s needed                                                  | Suggested action                                                                                         |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Git repository** (GitHub/Bitbucket)                                   | Central source of truth, pull‑request workflow, issue tracking.  | Create a new repo (`erp-distribuidora-medica`) and push the existing `docs/` folder.                     |
| **Branch strategy** (e.g., `main` + `dev` + feature branches)           | Keeps development isolated per sprint and enables safe releases. | Add a `dev` branch that will host the ongoing sprint work.                                               |
| **Initial code skeleton** (NestJS backend, optional Vite/Next.js front) | Gives developers a runnable app from day 1.                      | Run `npx -y @nestjs/cli new . --skip-git` (or the equivalent for your chosen front‑end) inside the repo. |
| **`.gitignore`** (Node, build artefacts, env files)                     | Prevents committing secrets or compiled files.                   | Use the standard Node/NestJS template.                                                                   |
| **README & CONTRIBUTING** (beyond the docs index)                       | Quick‑start guide for any new dev and contribution workflow.     | Add sections: “Setup”, “Running locally”, “Testing”, “Branch & PR policy”.                               |

---

## 2. Development Environment & Tooling

| Item                                                     | Why it’s needed                                                                       | Suggested action                                                                                                                            |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Node ≥ 20 + npm / pnpm**                               | Required to run NestJS & any front‑end tooling.                                       | Document exact version in `README` and add an `.nvmrc` file.                                                                                |
| **Docker Compose** (PostgreSQL, Redis, optional Mailhog) | Guarantees a reproducible DB & dependent services for every developer.                | Provide `docker-compose.yml` with a `db` service exposing port 5432 and a `redis` service.                                                  |
| **Environment file template** (`.env.example`)           | Centralises configurable values (DB connection, ARCA sandbox URLs, JWT secret, etc.). | List: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `ARCA_CERT_PATH`, `ARCA_CERT_PASS`, `ARCA_WSAA_URL`, `ARCA_WSARCA_URL`, `JWT_SECRET`. |
| **Linting / Formatting** (ESLint, Prettier)              | Keeps codebase consistent across sprints.                                             | Add config files and scripts (`npm run lint`, `npm run format`).                                                                            |
| **Testing framework** (Jest + SuperTest)                 | Enables unit / integration tests for the “Definition of Done”.                        | Scaffold `test/` folder and a sample test for a service.                                                                                    |
| **CI pipeline** (GitHub Actions)                         | Automates lint, test, build, and artifact generation on every PR.                     | Create `.github/workflows/ci.yml` that runs `npm ci`, `npm run lint`, `npm test`, and builds the Docker image.                              |

---

## 3. Configuration for ARCA (AFIP) Integration

| Item                                                                       | Status                                                            | Next step                                                                                                       |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Sandbox certificate (`.p12`) & password**                                | Provided in a previous answer (you need to generate/download it). | Place the file in a secure local `certs/` folder and reference it via `.env`.                                   |
| **Token‑generation script** (WSAA login)                                   | Not yet present in code.                                          | Add a small NestJS service (`ArcaAuthService`) that reads the cert, calls WSAA, caches the token/sign for 12 h. |
| **ARCA client wrapper** (Axios / SOAP)                                     | Missing.                                                          | Create a service (`ArcaService`) that uses the cached token/sign to invoke the ARCA SOAP endpoints.             |
| **Error‑handling & retry strategy** (pre‑CAE / post‑CAE failure scenarios) | Documented in the spec but not implemented.                       | Implement a retry‑queue (e.g., BullMQ) and idempotency keys.                                                    |

---

## 4. Sprint‑Ready Backlog Grooming

| Item                                                                     | Why it’s needed                                                              | Suggested action                                                                                                                               |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Prioritised sprint backlog** (e.g., Sprint 1 = Auth + Product catalog) | Gives the team a concrete set of **ready** stories with acceptance criteria. | Move the relevant user stories from `mvp_backlog.md` into a GitHub Project board (or Jira) and mark them “Ready”.                              |
| **Definition of Done (DoD)**                                             | Aligns expectations on testing, documentation, code review, and CI pass.     | Add a DoD checklist (code reviewed, unit tests ≥ 80 %, CI green, docs updated).                                                                |
| **Task breakdown** (sub‑tasks per story)                                 | Makes work estimable and trackable.                                          | For each story, create child tasks (e.g., “Create DB migration for `products` table”, “Implement `GET /products` endpoint”, “Write e2e test”). |
| **Estimation in story points**                                           | Supports capacity planning for each sprint.                                  | Use the existing point estimates from the backlog or run a quick planning poker session.                                                       |

---

## 5. Non‑Functional Foundations

| Item                                                                  | Reason                                                                       | Action                                                           |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **Security hardening** (Helmet, rate‑limiting, JWT expiration)        | Prevents obvious attack vectors from the start.                              | Add middleware in the NestJS app and document required env vars. |
| **Logging & monitoring** (Winston + Loki/Grafana or simple file logs) | Provides observability for early debugging.                                  | Configure a logger service and a Docker‑compose entry for Loki.  |
| **Backup / migration strategy**                                       | Guarantees data integrity when moving from dev to prod.                      | Include a `scripts/backup-db.sh` placeholder.                    |
| **API versioning & OpenAPI spec**                                     | Allows downstream consumers (mobile, future UI) to rely on stable contracts. | Generate Swagger with NestJS decorators and expose `/api-docs`.  |

---

## 6. Project Management Overheads

| Item                                                            | Why                                              | Action                                                          |
| --------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------- |
| **Stakeholder review schedule** (weekly demo/demo‑ready branch) | Keeps the client aligned with sprint deliveries. | Define a recurring meeting (e.g., every Friday 15 h).           |
| **Release plan & versioning** (Semantic versioning)             | Provides clear upgrade path.                     | Agree on a `v0.x` pre‑release scheme until MVP is shipped.      |
| **Documentation updates pipeline**                              | Ensures docs stay in sync with code.             | Add a step in CI that lints Markdown and fails on broken links. |

---

## Quick "Go‑Live" Checklist for Sprint 1

1. **Repository & CI** – Repo created, `dev` branch, CI passing.
2. **Env & Docker** – `.env.example`, Docker Compose up, PostgreSQL reachable.
3. **NestJS Scaffold** – Basic app running (`npm run start:dev`).
4. **Auth Service** – JWT login endpoint, user table migration, admin/vendedor seed data.
5. **Product Catalog** – `products` table migration, CRUD endpoints, basic unit tests.
6. **ARCA Stub** – Mocked ARCA client (returns static token) so you can run the first sprint without the real cert. Replace with real cert later.
7. **Sprint Board** – Sprint 1 stories moved to “In Progress”, tasks assigned, DoD defined.

Once these items are in place, you’ll have a **complete, reproducible development environment** and a **well‑groomed sprint backlog**, allowing you to start delivering value immediately.

---

_Feel free to ask for any of the concrete templates (CI workflow, Docker‑Compose, NestJS auth module, etc.) and I’ll generate them for you._
