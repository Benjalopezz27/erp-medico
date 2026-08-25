# Technical Stack & Architecture — Medical Distributor ERP

**Version:** 1.0  
**Status:** Approved  
**Deployment model:** Single cloud web application, accessed from one shared workstation  
**Users:** 4 people sharing a single computer (sequential access — no real concurrent sessions)  
**Roles:** ADMINISTRADOR / VENDEDOR

---

## 1. Operational Context

The system is accessed from **a single workstation** in the distributor's office. Four employees take turns using the same machine throughout the workday. This means:

- **No real concurrent database sessions** from multiple browsers.
- **No horizontal scaling** needed at any point in the MVP.
- A small Railway deployment is sufficient; no horizontal scaling is required.
- Row-level locking (`SELECT FOR UPDATE`) is still implemented as a correctness guarantee, not a performance requirement — it protects against any future multi-session or automation scenario.
- Session management via **JWT tokens stored in memory** (not `localStorage`) is sufficient; no WebSocket or SSE real-time sync is needed between sessions.

---

## 2. Full Stack Decision Table

| Layer                  | Technology                        | Discarded Alternative | Key Reason                                                                   |
| ---------------------- | --------------------------------- | --------------------- | ---------------------------------------------------------------------------- |
| **Backend framework**  | NestJS (Node.js / TypeScript)     | —                     | Already decided; modular architecture maps well to bounded contexts          |
| **ORM**                | **TypeORM**                       | Prisma                | Native `QueryRunner` + `SELECT FOR UPDATE`; explicit multi-step transactions |
| **Database**           | PostgreSQL 16                     | —                     | Already decided; ACID, immutable ledger, row-level locking                   |
| **Frontend**           | **Vite + React 19 (SPA)**         | Next.js               | Pure backoffice — SSR adds complexity with zero benefit                      |
| **Routing**            | TanStack Router v1                | React Router v6       | Fully type-safe, file-based routes                                           |
| **Server state**       | **TanStack Query v5**             | SWR / Apollo          | Caching + optimistic updates + retry; ideal for data grids                   |
| **UI components**      | **shadcn/ui + Tailwind CSS**      | Ant Design, MUI       | Composable, no vendor lock-in, perfect for data-dense ERP                    |
| **Forms**              | React Hook Form + Zod             | Formik                | Performance, shared schema validation with backend                           |
| **Data grids**         | **TanStack Table v8**             | AG Grid               | Sufficient for ≤350 products; no paid license required                       |
| **Queue / ARCA retry** | BullMQ + Redis                    | —                     | Idempotency keys for WSFE; exponential backoff                               |
| **Fiscal PDF**         | **Puppeteer (headless)**          | pdf-lib               | HTML → PDF with embedded QR; easier to maintain                              |
| **ARCA SOAP**          | `soap` npm + Axios                | Axios only            | `soap` parses WSDL; Axios handles WSAA token refresh                         |
| **Auth**               | Passport.js + JWT + NestJS Guards | —                     | Native NestJS integration                                                    |
| **Logging**            | Winston + Pino-HTTP               | —                     | Winston for app events; Pino for request-level logging                       |
| **Monorepo**           | **pnpm workspaces**               | Nx / Turborepo        | Simpler for solo dev; no build graph overhead                                |
| **Containerization**   | Production Dockerfiles + Compose  | Kubernetes            | Portable local/CI images without cluster complexity                          |
| **CI/CD**              | GitHub Actions                    | —                     | Already documented                                                           |
| **Hosting**            | **Railway**                       | Self-managed VPS      | Low operational burden, private networking and managed HTTPS                 |
| **Language**           | TypeScript (strict)               | —                     | Shared types between backend and frontend via `shared-types` package         |

---

## 3. System Architecture Overview

```
+-----------------------------------------------------------------+
|               SINGLE WORKSTATION (Chrome / Edge)                |
|         Vite + React 19 . TanStack Router/Query                 |
|              shadcn/ui . TanStack Table                         |
+-----------------------------------------------------------------+
                        |
                        | HTTPS . REST . JSON  (Bearer JWT)
                        |
+-----------------------------------------------------------------+
|                   NestJS API Server                             |
|                                                                 |
|  [Auth]  [Products/Stock]  [Sales/ARCA]  [Purchases/Costs]     |
|  [Customers/Prices]  [Cta Cte/Payments]  [Cheques]  [Treasury] |
|                                                                 |
|  Shared: Guards . Interceptors . AuditLog . ErrorFilter         |
+-----------------------------------------------------------------+
          |                          |
          v                          v
     [PostgreSQL]               [Redis]
      (TypeORM)               (BullMQ)
                                   |
                         [BullMQ Workers]
                          arca-queue:
                          . wsfe-emit
                          . wsfe-retry
                          . pdf-generate
                                   |
                                   | SOAP / HTTPS
                                   v
                         [ARCA / AFIP]
                          WSAA + WSFE SOAP
                          X.509 (.p12 cert)
```

---

## 4. Monorepo Structure (pnpm Workspaces)

```
erp-medico/
├── apps/
│   ├── backend/                    # NestJS
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── products/
│   │   │   │   ├── stock/
│   │   │   │   ├── suppliers/
│   │   │   │   ├── purchases/
│   │   │   │   ├── sales/
│   │   │   │   ├── arca/           # SOAP client + BullMQ worker
│   │   │   │   ├── customers/
│   │   │   │   ├── receivables/
│   │   │   │   ├── payments/
│   │   │   │   ├── checks/         # Cheques
│   │   │   │   ├── treasury/
│   │   │   │   ├── reports/
│   │   │   │   └── importer/       # Excel/CSV + saved templates
│   │   │   ├── common/
│   │   │   │   ├── guards/         # JwtAuthGuard, RolesGuard
│   │   │   │   ├── interceptors/   # AuditLog, ResponseWrapper
│   │   │   │   ├── filters/        # GlobalExceptionFilter
│   │   │   │   └── decorators/
│   │   │   ├── database/
│   │   │   │   ├── entities/       # TypeORM entities (1 per table)
│   │   │   │   └── migrations/
│   │   │   └── main.ts
│   │   └── test/
│   │
│   └── frontend/                   # Vite + React 19
│       ├── src/
│       │   ├── routes/             # TanStack Router (file-based)
│       │   │   ├── _auth/          # Protected layout
│       │   │   │   ├── dashboard/
│       │   │   │   ├── products/
│       │   │   │   ├── sales/
│       │   │   │   ├── purchases/
│       │   │   │   ├── customers/
│       │   │   │   ├── receivables/
│       │   │   │   ├── treasury/
│       │   │   │   └── reports/
│       │   │   └── login.tsx
│       │   ├── components/         # shadcn/ui + custom components
│       │   ├── hooks/
│       │   ├── api/                # TanStack Query + Axios client
│       │   └── lib/                # Shared Zod schemas
│       └── package.json
│
├── packages/
│   └── shared-types/               # DTOs + Zod schemas shared between apps
│       └── src/
│           ├── dtos/
│           └── schemas/
│
├── docker-compose.yml
├── pnpm-workspace.yaml
└── .github/workflows/ci.yml
```

---

## 5. Critical Flow — ARCA Integration

```
POST /sales  (confirm sale)
    |
    +-- BEGIN TRANSACTION (TypeORM QueryRunner)
    |   +-- Insert Sale + SaleItems
    |   +-- SELECT stock FOR UPDATE  <- row-level lock
    |   +-- Validate stock >= quantity  (reject if insufficient)
    |   +-- Insert StockMovement (immutable ledger entry)
    |   +-- UPDATE Stock.currentBaseStock
    |   +-- Insert AccountReceivable (if credit sale)
    |   +-- Insert FiscalDocument { status: PENDIENTE_FACTURACION }
    |   COMMIT
    |
    +-- ENQUEUE job -> arca-queue (BullMQ)
         idempotencyKey = saleId
         |
         +-- [Worker] Call WSFE.FECAESolicitar (SOAP)
         |
         +-- [Success]  UPDATE FiscalDocument { cae, caeExpiration, status: EMITIDO }
         |              Enqueue pdf-generate job
         |
         +-- [Pre-CAE failure]  Exponential backoff retry (x5)
         |                      After max retries: status -> RECHAZADO, alert admin
         |
         +-- [Post-CAE failure] FIRST call FECompConsultar (WSFE)
                                +-- Already emitted -> save CAE, mark EMITIDO
                                +-- Not emitted -> retry FECAESolicitar
```

> **Important:** The double-check before retry on post-CAE failure is **mandatory** to prevent fiscal document duplication. The BullMQ job `idempotencyKey` must be the `saleId`.

---

## 6. Key Dependencies

### Backend (`apps/backend`)

```json
{
  "dependencies": {
    "@nestjs/common": "^10",
    "@nestjs/core": "^10",
    "@nestjs/jwt": "^10",
    "@nestjs/passport": "^10",
    "@nestjs/bull": "^10",
    "@nestjs/swagger": "^7",
    "typeorm": "^0.3",
    "pg": "^8",
    "class-validator": "^0.14",
    "class-transformer": "^0.5",
    "bullmq": "^5",
    "ioredis": "^5",
    "soap": "^1",
    "axios": "^1",
    "xlsx": "^0.18",
    "puppeteer": "^22",
    "winston": "^3",
    "pino-http": "^9",
    "passport-jwt": "^4"
  }
}
```

### Frontend (`apps/frontend`)

```json
{
  "dependencies": {
    "react": "^19",
    "react-dom": "^19",
    "@tanstack/react-router": "^1",
    "@tanstack/react-query": "^5",
    "@tanstack/react-table": "^8",
    "axios": "^1",
    "react-hook-form": "^7",
    "zod": "^3",
    "@hookform/resolvers": "^3",
    "recharts": "^2",
    "date-fns": "^3",
    "lucide-react": "latest",
    "tailwindcss": "^3",
    "clsx": "^2",
    "tailwind-merge": "^2"
  }
}
```

---

## 7. Local Development Environment

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    ports: ['5432:5432']
    environment:
      POSTGRES_DB: erp_medico
      POSTGRES_USER: erp_user
      POSTGRES_PASSWORD: erp_pass

  redis:
    image: redis:7-alpine
    ports: ['6379:6379']

  mailhog:
    image: mailhog/mailhog
    ports: ['8025:8025', '1025:1025']
```

```bash
# Start local dev
docker compose up -d
pnpm --filter backend run start:dev   # NestJS on :3000
pnpm --filter frontend run dev        # Vite on :5173
```

---

## 8. Environment Variables

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=erp_user
DB_PASSWORD=erp_pass
DB_NAME=erp_medico

# Auth
JWT_SECRET=<256-bit-random>
JWT_EXPIRES_IN=8h

# Redis / BullMQ
REDIS_HOST=localhost
REDIS_PORT=6379

# ARCA / AFIP
ARCA_ENV=production           # or 'homologation'
ARCA_CUIT=20123456789
ARCA_CERT_PATH=/secrets/cert.p12
ARCA_CERT_PASS=<cert-password>
ARCA_WSAA_URL=https://wsaa.afip.gov.ar/ws/services/LoginCms
ARCA_WSFE_URL=https://servicios1.afip.gov.ar/wsfev1/service.asc
ARCA_PUNTO_VENTA=1
```

---

## 9. Staging & Production Hosting

**Proveedor objetivo:** Railway. Staging inicia en Hobby y producción se evalúa
con métricas reales antes del Go-Live; el crédito incluido no funciona como tope.

- Servicios frontend y backend construidos desde Dockerfiles del monorepo
- Autodeploy desde GitHub exclusivamente después de CI verde (`Wait for CI`)
- Nginx del frontend como proxy same-origin hacia el backend privado
- PostgreSQL administrado en una red aislada por ambiente
- Redis se incorpora al implementar BullMQ/ARCA, no antes
- Dominio Railway para staging y dominio comprado únicamente para producción
- Secrets, base de datos y red independientes por ambiente
- Health/readiness, logs, alertas de gasto y rollback documentado

```
Railway Edge (TLS administrado)
    +-- HTTPS -> frontend Nginx :8080
                    +-- /api/* -> backend.railway.internal:3000
                    +-- /* -> React SPA
```

El track se gestiona en [#65](https://github.com/Benjalopezz27/erp-medico/issues/65). Proveedor, tamaño, presupuesto, dominio/DNS, accesos, monitoreo, almacenamiento de backups, certificados ARCA y ventana de Go-Live son gates externos: no se asumen ni ejecutan sin aprobación explícita.

---

## 10. Anti-Patterns to Avoid

| Anti-pattern          | Correct approach                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------- |
| GraphQL               | Plain REST — CRUD + a few specialized endpoints                                             |
| Microservices         | Modular NestJS monolith — sequential single-workstation users do not justify the complexity |
| CQRS + Event Sourcing | Immutable ledger already covers audit — CQRS is over-engineering                            |
| Kubernetes            | Railway services backed by production Dockerfiles                                           |
| Prisma                | TypeORM for native `SELECT FOR UPDATE` + explicit `QueryRunner`                             |
| Next.js               | Vite SPA — pure backoffice, no SEO, no public pages                                         |
| Redux                 | Zustand (if needed) + TanStack Query for server state                                       |
| Electron / native app | Cloud web app — no offline requirement                                                      |
