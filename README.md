# ERP Distribuidora Médica

[![CI](https://github.com/Benjalopezz27/erp-medico/actions/workflows/ci.yml/badge.svg?branch=dev)](https://github.com/Benjalopezz27/erp-medico/actions/workflows/ci.yml)

Sistema ERP Liviano para Distribuidora Médica en Argentina. Diseñado para operación en puesto de trabajo único (acceso secuencial) con arquitectura transaccional robusta, facturación electrónica ARCA/AFIP (WSAA/WSFE) y control de stock estricto en tiempo real.

> **Estado del Proyecto:** En desarrollo activo sobre **Sprint 1 (Auth & Catálogo Base)**. Sprint 0 y US-01 están completados; US-02 tiene backend, persistencia y auditoría integrados, con la interfaz administrativa aún pendiente. US-03 a US-05 (categorías, unidades y catálogo de productos) todavía no están implementadas. Rama principal de integración: `dev`.

> **Entrega y ambientes:** CI está operativo. Staging, CD, observabilidad, backups y producción se implementarán progresivamente mediante la épica [#65](https://github.com/Benjalopezz27/erp-medico/issues/65); actualmente no existe un deployment productivo soportado.

---

## 🚀 Stack Tecnológico

- **Backend**: [NestJS](https://nestjs.com/) (Modular Monolith) + [TypeORM](https://typeorm.io/)
- **Base de Datos**: [PostgreSQL 16](https://www.postgresql.org/) (ACID, Bloqueo pesimista `SELECT FOR UPDATE`)
- **Colas / Caché**: [BullMQ](https://bullmq.io/) + [Redis 7](https://redis.io/) (Reintentos idempotentes y procesamiento asíncrono)
- **Frontend**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/) + [TanStack Router](https://tanstack.com/router) & [Query](https://tanstack.com/query) + [shadcn/ui](https://ui.shadcn.com/) + [Tailwind CSS](https://tailwindcss.com/)
- **Monorepo**: [pnpm workspaces](https://pnpm.io/workspaces) (`apps/backend`, `apps/frontend`, `packages/shared-types`)
- **Infraestructura Local**: Docker Compose (`postgres:16-alpine`, `redis:7-alpine`, `mailhog`)
- **Integración Fiscal**: `ArcaMockService` para desarrollo/testing (cliente real WSAA/WSFE con certificados `.p12` previsto para Sprint 8)

---

## 📋 Requisitos Previos

Asegúrate de tener instaladas las siguientes herramientas en tu sistema:

- **Node.js**: `>=20.0.0` (LTS recomendado).
- **pnpm**: `>=9.0.0` (el proyecto fija `pnpm@10.32.1` mediante `packageManager`). Se recomienda habilitarlo con `corepack enable`.
- **Docker Engine / Docker Desktop**: Con soporte para **Docker Compose v2**.
- **Git**: Para clonación y control de versiones.

---

## ⚙️ Configuración de Variables de Entorno

El archivo `.env.example` contiene la plantilla de configuración de referencia para desarrollo local. Copia la plantilla a `.env` en la raíz del repositorio:

```bash
# En Linux / macOS / Bash:
cp .env.example .env

# En Windows (PowerShell):
Copy-Item .env.example .env
```

> [!IMPORTANT]
>
> - El archivo `.env` nunca debe subirse a Git.
> - Define contraseñas seguras para `SEED_ADMIN_PASSWORD` y `SEED_VENDEDOR_PASSWORD`, requeridas para el comando `pnpm seed`.
> - Los certificados X.509 (`.p12`) y secretos de ARCA nunca deben versionarse en el repositorio.

---

## 🏃 Inicio Rápido (Quick Start)

Sigue estos pasos en orden para levantar el entorno de desarrollo local completo:

### 1. Clonar el repositorio

```bash
git clone https://github.com/Benjalopezz27/erp-medico.git
cd erp-medico
```

### 2. Habilitar pnpm e instalar dependencias

```bash
corepack enable
pnpm install --frozen-lockfile
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
```

### 4. Iniciar infraestructura local con Docker Compose

Levanta PostgreSQL 16, Redis 7 y Mailhog:

```bash
pnpm docker:up
```

Verifica que los contenedores estén activos y saludables:

```bash
docker compose ps
```

### 5. Ejecutar migraciones de base de datos

Aplica el esquema de tablas y restricciones en PostgreSQL:

```bash
pnpm db:migrate
```

### 6. Ejecutar seed inicial de usuarios

Crea los usuarios iniciales del sistema con contraseñas hasheadas en bcrypt (costo 12):

```bash
pnpm seed
```

### 7. Iniciar servidores de desarrollo

En terminales separadas:

```bash
# Terminal 1 — Backend NestJS API (puerto 3000)
pnpm dev:backend

# Terminal 2 — Frontend Vite + React 19 (puerto 5173)
pnpm dev:frontend
```

---

## 🌐 Servicios y Endpoints Locales

| Servicio                 | URL Local                             | Descripción                                       |
| ------------------------ | ------------------------------------- | ------------------------------------------------- |
| **Frontend Web App**     | `http://localhost:5173`               | SPA React 19 + TanStack Router/Query + shadcn/ui  |
| **Backend API Health**   | `http://localhost:3000/api/v1/health` | Healthcheck y diagnóstico de conectividad con DB  |
| **Swagger OpenAPI Docs** | `http://localhost:3000/api/docs`      | Documentación interactiva de endpoints y esquemas |
| **Mailhog Web UI**       | `http://localhost:8025`               | Bandeja de entrada para captura de emails locales |
| **PostgreSQL**           | `localhost:5432`                      | Base de datos relacional principal (`erp_medico`) |
| **Redis**                | `localhost:6379`                      | Colas de trabajo y caché BullMQ                   |

---

## 👤 Seed Inicial de Usuarios

El comando `pnpm seed` inicializa los dos usuarios base requeridos por las reglas del dominio:

- **Administrador**: `admin@erp.com` (Rol: `ADMINISTRADOR` — acceso total al sistema).
- **Vendedor**: `vendedor@erp.com` (Rol: `VENDEDOR` — ventas, POS y consultas de stock).

**Características del Seed:**

- Lee las contraseñas obligatorias desde `SEED_ADMIN_PASSWORD` y `SEED_VENDEDOR_PASSWORD` en `.env`.
- Hashea las contraseñas con **bcrypt (costo 12)**.
- **Idempotente**: Si los usuarios ya existen en la base de datos, omite la inserción sin duplicar ni fallar.
- Ejecución transaccional: Realiza rollback automático en caso de error.

---

## 📜 Catálogo de Scripts del Monorepo

Todos los scripts se ejecutan desde la raíz del monorepo con `pnpm <script>`:

| Script              | Comando Ejecutado                                 | Descripción                                                                     |
| ------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------- |
| `pnpm dev:backend`  | `pnpm --filter @erp/backend run start:dev`        | Inicia el backend NestJS en modo desarrollo con hot-reload (`:3000`)            |
| `pnpm dev:frontend` | `pnpm --filter @erp/frontend run dev`             | Inicia el frontend Vite en modo desarrollo (`:5173`)                            |
| `pnpm build`        | `pnpm -r run build`                               | Compila todos los paquetes del monorepo (`shared-types`, `backend`, `frontend`) |
| `pnpm lint`         | `pnpm -r run lint`                                | Ejecuta ESLint en todos los paquetes del workspace                              |
| `pnpm lint:fix`     | `pnpm -r run lint:fix`                            | Corrige problemas automáticos de ESLint                                         |
| `pnpm format`       | `prettier --write ...`                            | Formatea todos los archivos del repositorio con Prettier                        |
| `pnpm format:check` | `prettier --check ...`                            | Verifica cumplimiento de estilo Prettier sin modificar archivos                 |
| `pnpm test`         | `pnpm -r run test`                                | Ejecuta los tests unitarios en todos los paquetes                               |
| `pnpm test:cov`     | `pnpm -r run test:cov`                            | Ejecuta tests unitarios con reporte de cobertura de código                      |
| `pnpm test:e2e`     | `pnpm --filter @erp/backend run test:e2e`         | Ejecuta la suite de integración E2E contra base de datos de test                |
| `pnpm docker:up`    | `docker compose up -d`                            | Inicia los servicios de PostgreSQL, Redis y Mailhog en segundo plano            |
| `pnpm docker:down`  | `docker compose down`                             | Detiene y remueve los contenedores locales (conservando volúmenes de datos)     |
| `pnpm docker:logs`  | `docker compose logs -f`                          | Muestra los logs en tiempo real de los contenedores Docker                      |
| `pnpm db:migrate`   | `pnpm --filter @erp/backend run migration:run`    | Ejecuta las migraciones TypeORM pendientes                                      |
| `pnpm db:revert`    | `pnpm --filter @erp/backend run migration:revert` | Revierte la última migración TypeORM aplicada                                   |
| `pnpm seed`         | `pnpm --filter @erp/backend run seed`             | Ejecuta el script de seed inicial de usuarios                                   |
| `pnpm clean`        | `pnpm -r exec rimraf dist node_modules`           | Limpia los directorios `dist` y `node_modules` de todo el monorepo              |

---

## 📂 Estructura del Monorepo

```
erp-medico/
├── apps/
│   ├── backend/             # API Modular Monolith NestJS + TypeORM + Swagger
│   └── frontend/            # SPA Vite + React 19 + TanStack Router/Query + Tailwind
├── packages/
│   └── shared-types/        # DTOs, Enums y modelos de dominio compartidos
├── docs/                    # Especificaciones completas de arquitectura y negocio
│   ├── README.md            # Índice general de documentación
│   ├── domain_model.md      # Modelo de dominio y diccionario de entidades
│   ├── functional_specification.md # Especificación funcional definitiva
│   ├── mvp_backlog.md       # Backlog consolidado de 46 historias de usuario
│   ├── tech_stack.md        # Arquitectura técnica y decisiones de stack
│   ├── sprint_plan.md       # Plan detallado de 10 sprints
│   ├── git_workflow.md      # Estrategia Git y flujo de PRs
│   └── wireframes/          # Wireframes ASCII de las 35 pantallas
├── .github/
│   └── workflows/
│       └── ci.yml           # Pipeline de GitHub Actions CI (Lint, Test, Build)
├── docker-compose.yml       # Infraestructura local (PostgreSQL 16, Redis 7, Mailhog)
├── .env.example             # Plantilla de configuración documentada
├── pnpm-workspace.yaml      # Configuración de workspaces pnpm
└── package.json             # Manifiesto raíz del monorepo
```

---

## 🌿 Estrategia Git & Flujo de Contribución

- **`main`**: Rama de producción (protegida, estable, desplegable).
- **`dev`**: Rama principal de desarrollo e integración de sprints.
- **Ramas de trabajo**:
  - `feat/sN-usXX-*`: Funcionalidades asociadas a historias de usuario.
  - `fix/*`: Correcciones de bugs.
  - `docs/*`: Tareas exclusivas de documentación.
  - `hotfix/*`: Parches críticos sobre producción.
- **Flujo de Pull Requests**: Todo cambio debe integrarse mediante Pull Request hacia `dev` con CI verde (`Lint & Code Style`, `Backend Tests & Coverage`, `Build All Workspace Packages`).
- **Convención de Commits**: Conventional Commits con scope (`feat(s1-us01): ...`, `fix(test): ...`, `docs(s0-15): ...`).

Para más detalles, consulta [docs/git_workflow.md](docs/git_workflow.md).

---

## 📖 Índice de Documentación

Toda la documentación técnica, funcional y de negocio está disponible en la carpeta [`docs/`](docs/):

1. [Índice General de Documentación](docs/README.md)
2. [Modelo de Dominio y Diccionario de Entidades](docs/domain_model.md)
3. [Especificación Funcional Definitiva](docs/functional_specification.md)
4. [Backlog del MVP y Criterios de Aceptación](docs/mvp_backlog.md)
5. [Stack Tecnológico y Arquitectura](docs/tech_stack.md)
6. [Plan Detallado de Sprints](docs/sprint_plan.md)
7. [Wireframes de Pantallas (35 Vistas)](docs/wireframes/_index.md)
8. [Estrategia Git y Flujo de Trabajo](docs/git_workflow.md)
