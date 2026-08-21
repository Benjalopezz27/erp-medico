# Documentation Index — Medical Distributor ERP System

Welcome to the central documentation hub for the ERP System.

## Main Project Documents

1. [Formal Proposal & Commercial Budget (v1.0)](project_proposal_and_budget.md)
   - **Executive Summary**: Client-facing project proposal for the Medical Distributor ERP system.
   - **Scope Breakdown**: 16 MVP modules included vs Phase 2 out-of-scope items.
   - **Timeline & Deliverables**: 10 1-week Sprints (2.5 months total, ~52 Man-Days).
   - **Commercial Structure**: 4 milestone-based payments (25% initial, 25% catalog/stock/purchases, 25% sales/ARCA, 25% launch).
   - **Infrastructure & Warranty**: Cloud hosting requirements and 30-day post-launch warranty.

2. [Definitive Functional Specification — Frozen Scope (v1.0)](functional_specification.md)
   - **System Objectives & Frozen Scope**: Core transactional engine goals, Phase 1 MVP features vs Phase 2 Out-of-Scope items.
   - **Roles & Permissions**: Strictly 2 roles (`VENDEDOR` and `ADMINISTRADOR`).
   - **Decided Business Rules (1–10)**: Non-invoiced sales rules, strict credit sale invoicing prohibition, supplier invoice tolerance locks (`OBSERVADA`), un-invoiced remanents (`Pendientes de facturación`), partial returns & quarantine stock, client special prices hierarchy, cheque debt cancellation & reversal transaction, treasury structure (`EFECTIVO`, `BANCOS`, `CHEQUES`).
   - **State Machines**: Sale, Purchase Order, Supplier Invoice, Return & Quality Control, Cheque states.
   - **Core Engine Technical Specs**: ARCA Scenario A & B contingency handling, transactional cheque rejection reversal, retroactive cost distribution algorithm.
   - **Complexity Matrix**: Low (🟢), Medium (🟡), High (🔴) difficulty mapping.

3. [Domain Model & Entity Architecture (v1.0)](domain_model.md)
   - **Mermaid Entity-Relationship Diagram**: Full database model visualizing 28 domain entities and relations.
   - **Domain Enums & Data Types**: Roles, StockMovementTypes, Order/Invoice/Return/Cheque State Machines, Fiscal Types.
   - **Entity Catalog**: TypeScript schema specifications for Auth, Catalog/Inventory, Suppliers/Import, Purchasing/Costing, Pricing, Sales/ARCA, Accounts Receivable/Cheques, and Treasury/Caja.
   - **Domain Invariants**: Stock non-negative constraints, Cta Cte transaction invariants, Credit Sale fiscal mandate, Goods receipt conversion rules.

4. [Consolidated Backlog, Sprint Roadmap & Budget (v1.1)](mvp_backlog.md)
   - **Consolidated User Stories**: 46 non-redundant, fully specified user stories across 12 Epics.
   - **Detailed Acceptance Criteria**: Clear acceptance rules and edge-case criteria for every story.
   - **Technical Dependency Matrix & Critical Path**: Module flow from Auth $\rightarrow$ Inventory $\rightarrow$ Purchases $\rightarrow$ Costs/Prices $\rightarrow$ Sales/ARCA $\rightarrow$ Cta Cte/Cheques.
   - **Single-Developer Estimation**: 64–67.5 Man-Days total, including the transversal DevOps track.
   - **10-Sprint Execution Plan**: 13–15 weeks for one developer, delivering iterative functional milestones.

5. [Technical Stack & Architecture (v1.0)](tech_stack.md)
   - **Operational Context**: 4 users on a single shared workstation — sequential access, no real concurrency.
   - **Stack Decisions**: NestJS + TypeORM + PostgreSQL + BullMQ/Redis + Vite/React 19 SPA + shadcn/ui + pnpm monorepo.
   - **Architecture Diagram**: Single-VPS deployment, NestJS modules per bounded context, Hetzner CX21 hosting.
   - **ARCA Integration Flow**: Full BullMQ retry flow with idempotency keys and post-CAE duplicate prevention.
   - **Anti-Patterns**: Justified rejection of Prisma, Next.js, Microservices, Kubernetes, and GraphQL for this scale.

6. [Detailed Sprint Plan (v1.1)](sprint_plan.md)
   - **Sprint 0**: Infrastructure & scaffolding tasks (monorepo, Docker, CI, NestJS + Vite skeleton, ARCA mock).
   - **Sprints 1–10**: Full sprint breakdown with sprint goals, task-level decomposition per user story, and Definition of Done per sprint.
   - **Critical Path**: Dependency chain from Auth → Stock → Suppliers → Purchases → Costs → POS → ARCA → CtaCte → Reports.
   - **Blocker Identified**: AFIP `.p12` certificate required before Sprint 8 — must be obtained during Sprint 7.

7. [Low-Fidelity Wireframes (v1.0)](wireframes/_index.md)
   - **35 screens** covering every module: Auth, Dashboard, Products, Stock, Suppliers, Importer, Purchases, Supplier Invoices, Prices, Customers, POS, Sales, ARCA Alerts, Account Receivable, Payments, Checks, Treasury, Reports, and Admin.
   - **Format**: ASCII art wireframes with multiple states per screen (empty, loaded, error, modal overlays).
   - **Business rules embedded**: Stock non-negative errors, credit sale invoice lock, price review tray, ARCA contingency states, cheque reversal flow.

8. [Git Workflow & Branch Strategy (v1.0)](git_workflow.md)
   - **Branch model**: `main` (production) · `dev` (staging/integration) · `feat/sN-usXX-*` · `fix/*` · `hotfix/*`.
   - **Conventional Commits**: typed commits with US scope (`feat(us25): ...`) for full traceability.
   - **Self-review checklist**: replaces peer review for single-developer workflow.
   - **GitHub Actions**: CI (lint + test + build on PR) and CD (SSH deploy to Hetzner on merge to `main`).
   - **Versioning**: `v0.x` pre-release per milestone, `v1.0.0` at go-live.

---

## Technical Workflow & Progress Roadmap

```text
[1. Functional Spec (v1.0 Frozen)] ---► [2. Domain Model / Entity Architecture (v1.0)] ---► [3. Consolidated Backlog & Acceptance Criteria]
             (Completed)                                        (Completed)                                        (Completed)

                 ---► [4. Critical Path & Dependency Matrix] ---► [5. 10-Sprint Single-Dev Roadmap & Budget] ---► [6. Formal Client Proposal]
                                 (Completed)                                             (Completed)                       (Completed)

                 ---► [7. Technical Stack & Architecture (v1.0)]
                                 (Completed)
```
