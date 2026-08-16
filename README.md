# ERP Distribuidora Médica

Sistema ERP Liviano para Distribuidora Médica en Argentina. Diseñado para operación en puesto de trabajo único (acceso secuencial) con arquitectura transaccional robusta, facturación electrónica ARCA/AFIP (WSAA/WSFE) y control de stock estricto en tiempo real.

---

## 🚀 Tech Stack

- **Backend**: [NestJS](https://nestjs.com/) (Modular Monolith) + [TypeORM](https://typeorm.io/)
- **Database**: [PostgreSQL 16](https://www.postgresql.org/) (ACID, Pessimistic Row Locking `SELECT FOR UPDATE`)
- **Queue / Async Jobs**: [BullMQ](https://bullmq.io/) + [Redis 7](https://redis.io/) (Idempotent ARCA retries, PDF rendering)
- **Frontend**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/) + [TanStack Router](https://tanstack.com/router) & [Query](https://tanstack.com/query) + [shadcn/ui](https://ui.shadcn.com/) + [Tailwind CSS](https://tailwindcss.com/)
- **Monorepo**: [pnpm workspaces](https://pnpm.io/workspaces) (`apps/backend`, `apps/frontend`, `packages/shared-types`)
- **Infra / Deployment**: Hetzner CX21 VPS (Ubuntu 24.04), Docker Compose, Nginx Reverse Proxy, Certbot SSL

---

## 📂 Project Structure

```
erp-medico/
├── apps/
│   ├── backend/             # NestJS API
│   └── frontend/            # Vite + React 19 SPA
├── packages/
│   └── shared-types/        # Shared DTOs, Enums, Zod Schemas
├── docs/                    # Complete Project Documentation
│   ├── domain_model.md
│   ├── functional_specification.md
│   ├── mvp_backlog.md
│   ├── tech_stack.md
│   ├── sprint_plan.md
│   ├── git_workflow.md
│   └── wireframes/
├── scripts/                 # Utility & automation scripts
├── docker-compose.yml       # Local development dependencies
└── package.json             # Root monorepo workspace
```

---

## 🌿 Branch Strategy & Git Workflow

- **`main`**: Production release branch (protected, deployable).
- **`dev`**: Staging / integration branch for sprint deliverables and client demos.
- **`feat/sN-usXX-*`**: Feature branches per user story (merged via `--no-ff` into `dev`).
- **`hotfix/*`**: Critical production fixes (merged into `main` AND `dev`).

For full details on Conventional Commits, self-review checklists, and GitHub Actions CI/CD workflows, see [docs/git_workflow.md](docs/git_workflow.md).

---

## 📖 Documentation Index

All architectural, functional, and domain specifications are available in the [`docs/`](docs/) directory:

1. [System Overview & Documentation Index](docs/README.md)
2. [Domain Model & Entity Dictionary](docs/domain_model.md)
3. [Functional Specification](docs/functional_specification.md)
4. [MVP Backlog & Acceptance Criteria](docs/mvp_backlog.md)
5. [Technical Stack & Architecture](docs/tech_stack.md)
6. [Detailed Sprint Plan](docs/sprint_plan.md)
7. [Low-Fidelity Wireframes (35 Screens)](docs/wireframes/_index.md)
8. [Git Workflow & Branch Strategy](docs/git_workflow.md)
