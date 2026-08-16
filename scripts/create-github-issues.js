#!/usr/bin/env node
/**
 * create-github-issues.js
 *
 * Script para crear todas las User Stories y Tasks del ERP en GitHub.
 * Los 11 sprints parent issues ya están creados (issues #1–#11).
 * Este script crea las US y las linkea como sub-issues.
 *
 * PREREQUISITOS:
 *   - Node.js >= 18 (usa fetch nativo)
 *   - GitHub Personal Access Token con scope: repo
 *
 * USO:
 *   $env:GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxx"   # PowerShell
 *   node create-github-issues.js
 *
 *   O con token inline:
 *   GITHUB_TOKEN=ghp_xxx node create-github-issues.js
 */

const OWNER = "Benjalopezz27";
const REPO  = "erp-medico";
const TOKEN = process.env.GITHUB_TOKEN;

if (!TOKEN) {
  console.error("❌ Falta la variable GITHUB_TOKEN.");
  console.error("   Ejecutá: $env:GITHUB_TOKEN='ghp_tu_token'");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "Content-Type": "application/json",
};

// Sprint parent issues ya creados — NO modificar estos números
const SPRINT_ISSUE_NUMBERS = {
  0:  1,   // 🛠️ Sprint 0 — Infraestructura & Scaffolding
  1:  2,   // 📦 Sprint 1 — Auth & Catálogo Base
  2:  3,   // 📊 Sprint 2 — Motor de Stock
  3:  4,   // 🚡 Sprint 3 — Proveedores & Importador
  4:  5,   // 🛒 Sprint 4 — Compras & Recepciones
  5:  6,   // 💹 Sprint 5 — Facturas & Costos
  6:  7,   // 💲 Sprint 6 — Precios & Clientes
  7:  8,   // 🛍️ Sprint 7 — Punto de Venta
  8:  9,   // 🧾 Sprint 8 — ARCA / AFIP
  9: 10,   // 💳 Sprint 9 — Cuentas Corrientes & Cheques
  10: 11,  // 🏁 Sprint 10 — Tesorería, Reportes & Go-Live
};

// ─────────────────────────────────────────────
// Helper: crear una issue y devolver { number, id }
// ─────────────────────────────────────────────
async function createIssue(title, body) {
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/issues`, {
    method: "POST",
    headers,
    body: JSON.stringify({ title, body }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Error creando "${title}": ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  console.log(`  ✓ #${data.number} — ${title}`);
  return { number: data.number, id: data.id };
}

// ─────────────────────────────────────────────
// Helper: obtener el ID de una issue por su número
// (Necesario para sub_issue_write que usa el node_id GraphQL)
// ─────────────────────────────────────────────
async function getIssueNodeId(issueNumber) {
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/issues/${issueNumber}`, {
    headers,
  });
  const data = await res.json();
  return data.node_id;
}

// ─────────────────────────────────────────────
// Helper: agregar sub-issue via GraphQL (requiere node_id)
// ─────────────────────────────────────────────
async function addSubIssue(parentNumber, childNumber) {
  const parentNodeId = await getIssueNodeId(parentNumber);
  const childNodeId  = await getIssueNodeId(childNumber);

  const query = `
    mutation AddSubIssue($parentId: ID!, $childId: ID!) {
      addSubIssue(input: { issueId: $parentId, subIssueId: $childId }) {
        issue { number }
        subIssue { number }
      }
    }
  `;

  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables: { parentId: parentNodeId, childId: childNodeId } }),
  });

  const data = await res.json();
  if (data.errors) {
    console.warn(`  ⚠️  Sub-issue link #${childNumber} → #${parentNumber}: ${data.errors[0].message}`);
  } else {
    console.log(`  🔗 Linked #${childNumber} → #${parentNumber}`);
  }
}

// ─────────────────────────────────────────────
// Delay para respetar rate limits
// ─────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// =============================================================================
// ISSUES A CREAR
// Formato: { sprint: N, title: "...", body: "..." }
// =============================================================================
const issues = [

  // ── SPRINT 0 — Infraestructura ─────────────────────────────────────────────
  {
    sprint: 0,
    title: "[S0-T01] Crear repositorio y configurar branch strategy",
    body: `## Tarea de Infraestructura — Sprint 0

Crear repo \`erp-medico\` (privado), rama \`dev\`, branch protection rules.

### Checklist
- [ ] Repo creado en GitHub (privado)
- [ ] Rama \`dev\` creada
- [ ] Branch protection en \`main\`: require CI pass, no force push
- [ ] Branch protection en \`dev\`: require CI pass
- [ ] README inicial con descripción del proyecto

**Ref:** \`git_workflow.md\` — sección 2`,
  },
  {
    sprint: 0,
    title: "[S0-T02] Inicializar monorepo pnpm workspaces",
    body: `## Tarea de Infraestructura — Sprint 0

\`\`\`
erp-medico/
├── apps/backend/
├── apps/frontend/
└── packages/shared-types/
\`\`\`

### Checklist
- [ ] \`pnpm-workspace.yaml\` configurado
- [ ] \`package.json\` raíz con scripts \`-r\`
- [ ] \`.npmrc\` con configuración de pnpm`,
  },
  {
    sprint: 0,
    title: "[S0-T03] Configurar Docker Compose (Postgres + Redis + Mailhog)",
    body: `## Tarea de Infraestructura — Sprint 0

### Servicios
| Servicio | Imagen | Puerto |
|----------|--------|--------|
| PostgreSQL | \`postgres:16-alpine\` | 5432 |
| Redis | \`redis:7-alpine\` | 6379 |
| Mailhog | \`mailhog/mailhog\` | 8025 (UI), 1025 (SMTP) |

### Checklist
- [ ] \`docker-compose.yml\` creado y documentado
- [ ] \`.env.example\` con todas las vars de entorno
- [ ] \`docker compose up -d\` levanta sin errores`,
  },
  {
    sprint: 0,
    title: "[S0-T04] Scaffold NestJS con módulos vacíos",
    body: `## Tarea de Infraestructura — Sprint 0

Inicializar NestJS con \`@nestjs/cli\` y crear los 18 módulos vacíos del dominio.

### Módulos a crear
\`auth\`, \`users\`, \`products\`, \`stock\`, \`suppliers\`, \`importer\`, \`purchases\`, \`costs\`, \`prices\`, \`customers\`, \`sales\`, \`arca\`, \`receivables\`, \`payments\`, \`checks\`, \`treasury\`, \`reports\`, \`config\`

### Checklist
- [ ] Cada módulo tiene \`.module.ts\`, \`.service.ts\`, \`.controller.ts\` stubs
- [ ] \`AppModule\` importa todos los módulos
- [ ] \`pnpm --filter backend run start:dev\` arranca en \`:3000\``,
  },
  {
    sprint: 0,
    title: "[S0-T05] Configurar TypeORM y sistema de migraciones",
    body: `## Tarea de Infraestructura — Sprint 0

### Configuración
- \`TypeOrmModule.forRootAsync\` leyendo desde \`.env\`
- \`synchronize: false\` — NUNCA usar en producción
- \`migrationsRun: false\`
- \`migrations: ['dist/database/migrations/*.js']\`

### Scripts npm
\`\`\`json
"migration:generate": "typeorm migration:generate",
"migration:run": "typeorm migration:run",
"migration:revert": "typeorm migration:revert"
\`\`\`

### Checklist
- [ ] TypeORM conecta a PostgreSQL local
- [ ] Primera migración de verificación creada y ejecutable
- [ ] \`migration:revert\` revierte correctamente`,
  },
  {
    sprint: 0,
    title: "[S0-T06] Crear HealthCheckController",
    body: `## Tarea de Infraestructura — Sprint 0

\`GET /health\` → \`{ status: 'ok', timestamp: string, db: 'connected' | 'error' }\`

### Checklist
- [ ] Responde \`200 OK\` cuando DB está conectada
- [ ] Responde \`503\` cuando DB no está disponible
- [ ] Documentado en Swagger (\`@ApiTags('health')\`)`,
  },
  {
    sprint: 0,
    title: "[S0-T07] Scaffold Vite + React 19 frontend con dependencias",
    body: `## Tarea de Infraestructura — Sprint 0

### Dependencias a instalar
| Package | Versión | Propósito |
|---------|---------|-----------|
| \`@tanstack/react-router\` | v1 | Routing |
| \`@tanstack/react-query\` | v5 | Server state |
| \`shadcn/ui\` + \`tailwindcss\` | latest | UI components |
| \`axios\` | | HTTP client |
| \`react-hook-form\` + \`zod\` | | Forms + validation |
| \`lucide-react\` | | Icons |
| \`recharts\` | | Gráficos |
| \`zustand\` | | Client state (auth) |

### Checklist
- [ ] \`pnpm --filter frontend run dev\` arranca en \`:5173\`
- [ ] shadcn/ui inicializado (\`npx shadcn-ui@latest init\`)
- [ ] Tailwind configurado con el design system base`,
  },
  {
    sprint: 0,
    title: "[S0-T08] Crear layout base del frontend (App Shell)",
    body: `## Tarea de Infraestructura — Sprint 0

### Componentes a crear
- \`RootLayout\` — sidebar + topbar con usuario/rol/logout
- \`AuthLayout\` — wrapper para rutas protegidas (redirige a /login si no hay token)
- \`LoginPage\` — estructura vacía (implementación real en US-01)
- \`NotFoundPage\` — 404

### Sidebar items
Dashboard, Productos, Stock, Compras, Ventas, Clientes, Cta Cte, Tesorería, Reportes, Configuración

### Checklist
- [ ] Sidebar colapsa en mobile
- [ ] Topbar muestra nombre de usuario y rol
- [ ] TanStack Router configurado con rutas placeholder`,
  },
  {
    sprint: 0,
    title: "[S0-T09] Crear package shared-types con enums del dominio",
    body: `## Tarea de Infraestructura — Sprint 0

### Enums a exportar desde \`packages/shared-types/src/index.ts\`
\`\`\`typescript
export enum UserRole { ADMINISTRADOR, VENDEDOR }
export enum StockMovementType { ENTRADA, SALIDA, MERMA, AJUSTE, DEVOLUCION }
export enum SaleStatus { BORRADOR, CONFIRMADA, ANULADA }
export enum FiscalDocumentType { FACTURA_A, FACTURA_B, NC_A, NC_B, ND_A, ND_B, REMITO }
export enum ArcaStatus { PENDIENTE_FACTURACION, EMITIDO, RECHAZADO }
export enum CheckStatus { RECIBIDO, EN_CARTERA, DEPOSITADO, ENDOSADO, RECHAZADO }
export enum PurchaseOrderStatus { BORRADOR, EMITIDA, PARCIAL, COMPLETADA, CANCELADA }
export enum SupplierInvoiceStatus { BORRADOR, VALIDANDO, OBSERVADA, AUTORIZADA, CONFIRMADA }
export enum PriceReviewStatus { PENDIENTE, APROBADO, RECHAZADO, POSPUESTO }
export enum QuarantineStatus { EN_CUARENTENA, MERMA_CONFIRMADA, DEVOLUCION_PROVEEDOR, REINGRESADO_STOCK }
\`\`\`

### Checklist
- [ ] Package buildeado con TypeScript
- [ ] Instalado como dependencia en backend y frontend
- [ ] Los enums son importables en ambos`,
  },
  {
    sprint: 0,
    title: "[S0-T10] Configurar ESLint + Prettier en monorepo",
    body: `## Tarea de Infraestructura — Sprint 0

### Checklist
- [ ] ESLint configurado en los 3 packages con reglas compartidas
- [ ] Prettier con configuración consistente (\`singleQuote: true\`, \`semi: true\`, \`tabWidth: 2\`)
- [ ] Scripts: \`lint\`, \`lint:fix\`, \`format\` en cada \`package.json\`
- [ ] \`pnpm -r run lint\` pasa sin errores en proyecto vacío`,
  },
  {
    sprint: 0,
    title: "[S0-T11] Configurar GitHub Actions CI",
    body: `## Tarea de Infraestructura — Sprint 0

Crear \`.github/workflows/ci.yml\` con jobs: **lint**, **test**, **build**.

### Triggers
- Push a cualquier rama
- Pull Request a \`dev\` y \`main\`

### Job \`test\` requiere servicios
- \`postgres:16-alpine\` en puerto 5432
- \`redis:7-alpine\` en puerto 6379

### Checklist
- [ ] CI pasa en el proyecto skeleton
- [ ] Badge de CI en README
- [ ] Cacheo de dependencias pnpm configurado

**Ref:** \`git_workflow.md\` — sección 7`,
  },
  {
    sprint: 0,
    title: "[S0-T12] Crear .env.example documentado",
    body: `## Tarea de Infraestructura — Sprint 0

Documentar TODAS las variables de entorno requeridas con comentarios explicativos.

### Grupos de variables
- **Database:** DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
- **Auth:** JWT_SECRET, JWT_EXPIRATION
- **Redis:** REDIS_HOST, REDIS_PORT
- **ARCA:** ARCA_ENV (development|homologation|production), ARCA_CERT_PATH, ARCA_CERT_PASSWORD, ARCA_PUNTO_VENTA, ARCA_CUIT
- **App:** PORT, NODE_ENV, FRONTEND_URL
- **Email:** SMTP_HOST, SMTP_PORT

### Checklist
- [ ] \`.env.example\` completo y comentado
- [ ] \`.env\` en \`.gitignore\` (VERIFICAR)
- [ ] Carpeta \`secrets/\` en \`.gitignore\` (para certificados ARCA)`,
  },
  {
    sprint: 0,
    title: "[S0-T13] Crear script de seed inicial de usuarios",
    body: `## Tarea de Infraestructura — Sprint 0

Crear \`src/database/seeds/initial.seed.ts\`:

### Usuarios seed
| Email | Contraseña | Rol |
|-------|-----------|-----|
| \`admin@erp.com\` | \`Admin1234!\` | ADMINISTRADOR |
| \`vendedor@erp.com\` | \`Vendedor1234!\` | VENDEDOR |

Las contraseñas se hashean con **bcrypt rounds=12** en el seed.

### Checklist
- [ ] Script ejecutable con \`pnpm --filter backend run seed\`
- [ ] Idempotente (no falla si los usuarios ya existen)
- [ ] Contraseñas hasheadas, NUNCA en texto plano`,
  },
  {
    sprint: 0,
    title: "[S0-T14] Crear ArcaMockService para ambiente de desarrollo",
    body: `## Tarea de Infraestructura — Sprint 0

\`src/modules/arca/arca-mock.service.ts\` implementa la misma interfaz que el cliente SOAP real:

\`\`\`typescript
interface IArcaService {
  login(): Promise<{ token: string; sign: string }>;
  requestCAE(data: FiscalDocumentData): Promise<{ cae: string; caeExpiration: string }>;
  queryDocument(type: number, pventa: number, number: number): Promise<FiscalDocument | null>;
}
\`\`\`

### Mock behavior
- \`requestCAE()\` devuelve CAE fake: \`'99999999999999'\`, delay 200ms
- \`queryDocument()\` devuelve \`null\` (simula que no existe)
- Activado con \`ARCA_ENV=development\`

### Checklist
- [ ] Activado automáticamente en entorno de desarrollo
- [ ] NO puede activarse en \`ARCA_ENV=production\` (guard)`,
  },
  {
    sprint: 0,
    title: "[S0-T15] Crear README del proyecto",
    body: `## Tarea de Infraestructura — Sprint 0

### Secciones del README
1. **Descripción** — qué es el sistema, para quién
2. **Stack** — NestJS, TypeORM, PostgreSQL, React 19, BullMQ, pnpm monorepo
3. **Requisitos** — Node >=20, pnpm, Docker
4. **Setup local** — paso a paso (clone, .env, docker compose, seed, dev)
5. **Estructura del monorepo** — árbol de directorios
6. **Scripts principales** — lint, test, build, seed, migration
7. **Convención de commits** — Conventional Commits con scope de US
8. **Links** — a la carpeta \`docs/\` con toda la documentación

### Checklist
- [ ] README completo y legible
- [ ] Badge de CI de GitHub Actions`,
  },

  // ── SPRINT 1 — Auth & Catálogo ──────────────────────────────────────────────
  {
    sprint: 1,
    title: "[US-01] Autenticación y Gestión de Sesión",
    body: `## Historia de Usuario
**Como** usuario del sistema, **quiero** iniciar sesión con email y contraseña **para** acceder a las funcionalidades según mi rol.

## Estimación
**1 día** | Complejidad: 🟢 Baja | Sprint 1

## Criterios de Aceptación
- [ ] Login con JWT (expiración 8h)
- [ ] Roles: \`ADMINISTRADOR\` y \`VENDEDOR\`
- [ ] Error genérico: "Credenciales inválidas" (no revelar qué campo es incorrecto)
- [ ] Redirección post-login según rol (ADMIN → dashboard, VENDEDOR → POS)
- [ ] Token almacenado en memoria (Zustand), no en localStorage

## Tareas Técnicas
- [ ] **[Backend]** Migración + entidad \`User\` (id, name, email, passwordHash, role, isActive, timestamps)
- [ ] **[Backend]** \`AuthModule\`: \`AuthService.login()\` con bcrypt, \`JwtStrategy\`, \`JwtAuthGuard\`, \`RolesGuard\`, \`@Roles()\`
- [ ] **[Backend]** \`POST /auth/login\` → \`{ accessToken, user: { id, name, role } }\`
- [ ] **[Backend]** Seed de usuarios funcional
- [ ] **[Frontend]** Página de Login con React Hook Form + Zod, \`useAuthStore\` (Zustand)
- [ ] **[QA]** Tests: credenciales válidas, inválidas, usuario inactivo

## Entidades
\`User\``,
  },
  {
    sprint: 1,
    title: "[US-02] Administración de Usuarios y Auditoría Inmutable",
    body: `## Historia de Usuario
**Como** Administrador, **quiero** crear, editar y desactivar usuarios manteniendo trazabilidad de las acciones sensibles.

## Estimación
**1.5 días** | Complejidad: 🟢 Baja | Sprint 1

## Criterios de Aceptación
- [ ] CRUD de usuarios accesible solo para ADMINISTRADOR
- [ ] \`DELETE\` = soft-delete (\`isActive = false\`), el registro permanece
- [ ] No se puede desactivar el último ADMINISTRADOR activo
- [ ] \`AuditLog\` es inmutable (sin UPDATE ni DELETE en esa tabla)
- [ ] Cambios de rol y estado quedan registrados en AuditLog

## Tareas Técnicas
- [ ] **[Backend]** Migración + entidad \`AuditLog\` (id, action, entityName, entityId, previousValueJSON, newValueJSON, userId, createdAt)
- [ ] **[Backend]** \`UsersModule\` CRUD con soft-delete
- [ ] **[Backend]** \`AuditLogInterceptor\` — registra automáticamente mutaciones sensibles
- [ ] **[Frontend]** Página \`/admin/users\`: tabla + modal create/edit
- [ ] **[QA]** Test: soft-delete no elimina el registro; AuditLog crece correctamente

## Entidades
\`User\`, \`AuditLog\``,
  },
  {
    sprint: 1,
    title: "[US-03] CRUD de Categorías y Unidades de Medida",
    body: `## Historia de Usuario
**Como** Administrador, **quiero** gestionar las categorías de productos y las unidades de medida disponibles en el sistema.

## Estimación
**1 día** | Complejidad: 🟢 Baja | Sprint 1

## Criterios de Aceptación
- [ ] Crear, editar y listar categorías (nombre, descripción)
- [ ] Crear, editar y listar unidades (nombre, símbolo — ej: "Unidad"/"U", "Caja"/"Cj")
- [ ] No se puede eliminar una categoría con productos asociados

## Tareas Técnicas
- [ ] **[Backend]** Migraciones + entidades \`Category\` y \`Unit\`
- [ ] **[Backend]** \`CategoriesModule\` y \`UnitsModule\` con CRUD
- [ ] **[Frontend]** Página \`/admin/settings\` con tabs: Categorías y Unidades
- [ ] **[QA]** Test: eliminar categoría con productos → error 422

## Entidades
\`Category\`, \`Unit\``,
  },
  {
    sprint: 1,
    title: "[US-04] Catálogo de Productos y Factores de Conversión",
    body: `## Historia de Usuario
**Como** Administrador, **quiero** crear y editar productos configurando sus equivalencias entre unidades para que las conversiones sean automáticas en todo el sistema.

## Estimación
**2 días** | Complejidad: 🟡 Media | Sprint 1

## Criterios de Aceptación
- [ ] Código interno único por producto
- [ ] Definición de equivalencias: ej. 1 Caja Master = 1.000 unidades base
- [ ] Precio sugerido calculado: \`Costo Neto × (1 + Markup%)\`
- [ ] Precio activo editable independientemente del precio sugerido

## Tareas Técnicas
- [ ] **[Backend]** Migraciones + entidades \`Product\` y \`ProductUnitConversion\`
- [ ] **[Backend]** \`ProductsModule\` CRUD, validación de \`internalCode\` único
- [ ] **[Backend]** \`GET /products/:id/conversions\` + \`POST/PATCH/DELETE /products/:id/conversions\`
- [ ] **[Frontend]** Formulario con sección de conversiones (tabla dinámica: Unidad → Factor)
- [ ] **[Frontend]** Lista de productos con filtros por categoría y estado
- [ ] **[QA]** Tests: cálculo de precio sugerido, internalCode único

## Entidades
\`Product\`, \`ProductUnitConversion\``,
  },
  {
    sprint: 1,
    title: "[US-05] Consulta y Búsqueda de Productos",
    body: `## Historia de Usuario
**Como** Vendedor o Administrador, **quiero** buscar productos por código o nombre para conocer su stock disponible y precio activo.

## Estimación
**1 día** | Complejidad: 🟢 Baja | Sprint 1

## Criterios de Aceptación
- [ ] Búsqueda con debounce de 300ms
- [ ] Muestra: código interno, nombre, stock actual, unidad base, precio activo
- [ ] Accesible para VENDEDOR y ADMINISTRADOR
- [ ] Componente \`ProductSearchInput\` reutilizable en todo el sistema

## Tareas Técnicas
- [ ] **[Backend]** \`GET /products?search=&category=&status=\` con paginación
- [ ] **[Backend]** \`GET /products/search?q=\` optimizado para typeahead (< 100ms)
- [ ] **[Frontend]** Componente \`ProductSearchInput\` con dropdown de resultados
- [ ] **[QA]** Tests: búsqueda por código exacto, parcial por nombre, sin resultados

## Entidades
\`Product\`, \`Stock\``,
  },

  // ── SPRINT 2 — Stock ────────────────────────────────────────────────────────
  {
    sprint: 2,
    title: "[US-06] Ledger Transaccional Inmutable de Stock",
    body: `## Historia de Usuario
**Como** sistema, **quiero** registrar todo movimiento de stock en un ledger inmutable para garantizar la trazabilidad completa del inventario.

## Estimación
**2 días** | Complejidad: 🔴 Alta | Sprint 2

## Criterios de Aceptación
- [ ] Todo cambio de stock genera un \`StockMovement\` (inmutable, solo INSERT)
- [ ] \`StockMovement\` registra: fecha, producto, tipo, cantidadBase, stockAnterior, stockPosterior, motivo, referenciaDoc, usuario
- [ ] \`currentBaseStock = suma de todos los movimientos\` (verificable en tests)

## Tareas Técnicas
- [ ] **[Backend]** Migraciones: tabla \`stock\` (productId unique, currentBaseStock) + tabla \`stock_movements\`
- [ ] **[Backend]** \`StockService.recordMovement(params)\`: atomicity con TypeORM transaction
- [ ] **[Backend]** \`GET /stock\` y \`GET /stock/:productId/movements\`
- [ ] **[Frontend]** Página \`/stock\`: tabla con estado NORMAL 🟢 / BAJO 🟡 / CRÍTICO 🔴
- [ ] **[Frontend]** Página \`/stock/:productId\`: gráfico Recharts + tabla de movimientos
- [ ] **[QA]** Test: \`currentBaseStock = Σ movimientos\` tras N operaciones

## Invariante de Dominio
\`currentBaseStock >= 0\` (enforced por CHECK constraint en DB)

## Entidades
\`Stock\`, \`StockMovement\``,
  },
  {
    sprint: 2,
    title: "[US-07] Backend-Enforcement de Stock No Negativo",
    body: `## Historia de Usuario
**Como** sistema, **quiero** que sea físicamente imposible que el stock quede negativo, independientemente de quién haga la solicitud.

## Estimación
**1.5 días** | Complejidad: 🔴 Alta | Sprint 2

## Criterios de Aceptación
- [ ] \`StockService.recordMovement(SALIDA)\` lanza \`InsufficientStockException\` (HTTP 422) si \`newStock < 0\`
- [ ] Lock a nivel DB: \`SELECT stock FOR UPDATE\` antes de calcular el nuevo stock
- [ ] Constraint DB: \`CHECK (current_base_stock >= 0)\`
- [ ] La excepción incluye el mensaje: "Stock insuficiente: disponible X, solicitado Y"

## Tareas Técnicas
- [ ] **[Backend]** Validación en \`StockService.recordMovement()\`
- [ ] **[Backend]** \`QueryRunner\` + \`setLock('pessimistic_write')\` en la transacción
- [ ] **[Backend]** Constraint \`CHECK (current_base_stock >= 0)\` en migración
- [ ] **[QA]** Test concurrencia simulada: dos salidas simultáneas donde solo una debe pasar

## Entidades
\`Stock\`, \`StockMovement\``,
  },
  {
    sprint: 2,
    title: "[US-08] Movimientos Manuales y Alertas de Stock Bajo",
    body: `## Historia de Usuario
**Como** Administrador, **quiero** registrar entradas y salidas manuales justificadas y ver un panel de productos bajo su stock mínimo.

## Estimación
**1 día** | Complejidad: 🟡 Media | Sprint 2

## Criterios de Aceptación
- [ ] Formulario de ajuste manual con motivo obligatorio
- [ ] Tipos: ENTRADA, SALIDA, MERMA, AJUSTE
- [ ] Badge en sidebar con count de productos bajo mínimo (clickeable)
- [ ] Solo ADMINISTRADOR puede hacer ajustes manuales

## Tareas Técnicas
- [ ] **[Backend]** \`POST /stock/adjustments\` con validación de motivo obligatorio
- [ ] **[Backend]** \`GET /stock/alerts\` — productos donde \`currentBaseStock <= minStock\`
- [ ] **[Frontend]** Modal de ajuste manual en lista de stock
- [ ] **[Frontend]** Badge en sidebar con link a \`/stock?filter=alerts\`
- [ ] **[QA]** Test: ajuste con motivo vacío → rechazado (422)

## Entidades
\`Stock\`, \`StockMovement\``,
  },
  {
    sprint: 2,
    title: "[US-09] Carga Inicial Masiva de Inventario",
    body: `## Historia de Usuario
**Como** Administrador, **quiero** cargar el inventario inicial desde una planilla Excel/CSV para no tener que ingresar producto por producto.

## Estimación
**1.5 días** | Complejidad: 🟡 Media | Sprint 2

## Criterios de Aceptación
- [ ] Plantilla descargable: columnas \`Código Interno | Cantidad Base\`
- [ ] Preview pre-importación con filas válidas (verde) e inválidas (rojo)
- [ ] Botón "Confirmar Carga" deshabilitado si hay errores
- [ ] Cada fila genera un \`StockMovement\` de tipo \`AJUSTE\` con reason = "Carga Inicial"

## Tareas Técnicas
- [ ] **[Backend]** \`POST /stock/bulk-load\`: parsea Excel/CSV con SheetJS, devuelve preview
- [ ] **[Backend]** \`POST /stock/bulk-load/confirm\`: aplica importación en transacción
- [ ] **[Frontend]** Wizard: Upload → Preview con validación → Confirmación
- [ ] **[QA]** Test: código inválido → fila marcada como error, importación no afecta DB

## Entidades
\`Stock\`, \`StockMovement\``,
  },
  {
    sprint: 2,
    title: "[US-10] Gestión de Stock Retenido / Cuarentena",
    body: `## Historia de Usuario
**Como** Administrador, **quiero** gestionar los productos devueltos no aptos en una zona de cuarentena aislada del stock disponible para venta.

## Estimación
**1.5 días** | Complejidad: 🟡 Media | Sprint 2

## Criterios de Aceptación
- [ ] Stock en cuarentena NO computa como stock disponible para ventas
- [ ] Flujo de resolución: **Merma** | **Devolución a Proveedor** | **Reingreso Autorizado**
- [ ] Solo ADMINISTRADOR puede autorizar el reingreso
- [ ] El reingreso genera un \`StockMovement(ENTRADA)\`

## Tareas Técnicas
- [ ] **[Backend]** Migración + entidad \`QuarantineStock\`
- [ ] **[Backend]** \`POST /quarantine\` y \`PATCH /quarantine/:id/resolve\`
- [ ] **[Frontend]** Página \`/stock/quarantine\` con dropdown de resolución
- [ ] **[QA]** Test: reingreso desde cuarentena actualiza ledger correctamente

## Entidades
\`QuarantineStock\`, \`Stock\`, \`StockMovement\``,
  },

  // ── SPRINT 3 — Proveedores ──────────────────────────────────────────────────
  {
    sprint: 3,
    title: "[US-11] CRUD de Proveedores",
    body: `## Historia de Usuario
**Como** Administrador, **quiero** registrar y administrar los proveedores con sus datos fiscales y comerciales.

## Estimación
**1 día** | Complejidad: 🟢 Baja | Sprint 3

## Criterios de Aceptación
- [ ] Campos: Razón Social, CUIT, Dirección, Teléfono, Email, WhatsApp, Condición Fiscal, Estado
- [ ] CUIT único en el sistema
- [ ] Links directos a \`wa.me/{whatsApp}\` y \`mailto:{email}\`
- [ ] Soft-delete (no eliminar proveedores con historial)

## Tareas Técnicas
- [ ] **[Backend]** Migración + entidad \`Supplier\`
- [ ] **[Backend]** \`SuppliersModule\` CRUD con validación CUIT único
- [ ] **[Frontend]** Página \`/suppliers\` con tabla + modal formulario
- [ ] **[QA]** Test: CUIT duplicado → error 422

## Entidades
\`Supplier\``,
  },
  {
    sprint: 3,
    title: "[US-12] Diccionario de Códigos Producto ↔ Proveedor",
    body: `## Historia de Usuario
**Como** Administrador, **quiero** asociar los SKUs externos de cada proveedor con los productos internos del catálogo, para que el importador pueda resolver equivalencias automáticamente.

## Estimación
**1.5 días** | Complejidad: 🟡 Media | Sprint 3

## Criterios de Aceptación
- [ ] 1 Producto Interno ↔ N \`SupplierProduct\` (uno por proveedor)
- [ ] Guarda: código proveedor, descripción proveedor, unidad compra, factor conversión, costo habitual, indicador habitual
- [ ] No se puede asociar el mismo producto dos veces al mismo proveedor

## Tareas Técnicas
- [ ] **[Backend]** Migración + entidad \`SupplierProduct\`
- [ ] **[Backend]** CRUD de asociaciones \`GET/POST/PATCH/DELETE /suppliers/:id/products\`
- [ ] **[Frontend]** Sub-página \`/suppliers/:id/catalog\` con \`ProductSearchInput\`
- [ ] **[QA]** Test: asociación duplicada proveedor-producto → error

## Entidades
\`SupplierProduct\`, \`Supplier\`, \`Product\``,
  },
  {
    sprint: 3,
    title: "[US-13] Subida, Mapeo Dinámico y Plantillas por Proveedor",
    body: `## Historia de Usuario
**Como** Administrador, **quiero** subir un Excel/CSV de un proveedor, configurar el mapeo de sus columnas a los campos del sistema, y guardar esa configuración como una plantilla reutilizable.

## Estimación
**3 días** | Complejidad: 🔴 Alta | Sprint 3

## Criterios de Aceptación
- [ ] Asignación dinámica de columnas (Código SKU, Descripción, Cantidad, Precio, Unidad)
- [ ] Guardado de plantillas asociadas al proveedor
- [ ] Auto-aplicación de plantilla al seleccionar un proveedor con plantilla guardada
- [ ] Badge "Plantilla aplicada: [nombre]" cuando se auto-aplica

## Tareas Técnicas
- [ ] **[Backend]** Migración + entidad \`SupplierImportTemplate\` (mappingJSON)
- [ ] **[Backend]** \`POST /importador/upload\`: parsea con SheetJS, devuelve \`{ headers, preview, detectedMapping? }\`
- [ ] **[Backend]** CRUD de plantillas \`GET/POST /importador/templates?supplierId=\`
- [ ] **[Frontend]** Wizard Paso 1: select proveedor + uploader
- [ ] **[Frontend]** Wizard Paso 2: tabla de mapeo de columnas con dropdowns
- [ ] **[QA]** Test: guardar plantilla → subir nuevo archivo → verificar auto-aplicación

## Entidades
\`SupplierImportTemplate\``,
  },
  {
    sprint: 3,
    title: "[US-14] Previsualización, Validaciones y Resolución de SKUs Desconocidos",
    body: `## Historia de Usuario
**Como** Administrador, **quiero** previsualizar la importación, ver los SKUs no reconocidos y vincularlos al catálogo interno antes de confirmar la operación.

## Estimación
**2.5 días** | Complejidad: 🔴 Alta | Sprint 3

## Criterios de Aceptación
- [ ] Preview dividido en 3 secciones: Listos ✅, SKUs Desconocidos ⚠️, Errores ❌
- [ ] Resolución inline por fila: \`ProductSearchInput\` + factor de conversión → "Resolver"
- [ ] Al resolver, el ítem pasa de Desconocidos a Listos
- [ ] Botón "Confirmar Importación" deshabilitado si quedan errores pendientes

## Tareas Técnicas
- [ ] **[Backend]** \`POST /importador/preview\`: devuelve \`{ valid, unknown, errors }\`
- [ ] **[Backend]** \`POST /importador/resolve-unknown\`: crea \`SupplierProduct\` desde SKU desconocido
- [ ] **[Backend]** \`POST /importador/confirm\`: aplica importación en transacción TypeORM
- [ ] **[Frontend]** Wizard Paso 3: 3 secciones colapsables con resolución inline
- [ ] **[QA]** Test: 2 válidos + 1 desconocido → resolver → confirmar → los 3 se procesaron

## Entidades
\`SupplierProduct\`, \`SupplierImportTemplate\``,
  },

  // ── SPRINT 4 — Compras ─────────────────────────────────────────────────────
  {
    sprint: 4,
    title: "[US-15] Crear y Gestionar Órdenes de Compra",
    body: `## Historia de Usuario
**Como** Administrador, **quiero** emitir órdenes de compra a proveedores especificando ítems, unidades de compra y costos esperados.

## Estimación
**2 días** | Complejidad: 🟡 Media | Sprint 4

## Criterios de Aceptación
- [ ] Estados: \`BORRADOR → EMITIDA → PARCIAL → COMPLETADA | CANCELADA\`
- [ ] OC emitida no puede ser editada
- [ ] OC cancelada no puede ser emitida
- [ ] Total estimado calculado automáticamente

## Tareas Técnicas
- [ ] **[Backend]** Migraciones + entidades \`PurchaseOrder\` y \`PurchaseOrderItem\`
- [ ] **[Backend]** \`PATCH /purchase-orders/:id/emit\` y \`PATCH /purchase-orders/:id/cancel\`
- [ ] **[Frontend]** Formulario de OC con tabla dinámica de ítems
- [ ] **[Frontend]** Lista de OCs con filtros y acciones por estado
- [ ] **[QA]** Test: transiciones de estado inválidas son rechazadas

## Entidades
\`PurchaseOrder\`, \`PurchaseOrderItem\``,
  },
  {
    sprint: 4,
    title: "[US-16] Registrar Recepción de Mercadería y Conversión a Stock Base",
    body: `## Historia de Usuario
**Como** Administrador, **quiero** registrar la mercadería recibida y que el stock se actualice automáticamente en unidades base.

## Estimación
**2.5 días** | Complejidad: 🔴 Alta | Sprint 4

## Criterios de Aceptación
- [ ] Conversión implícita: \`receivedQtyBaseUnits = receivedQtyPurchaseUnit × conversionFactor\`
- [ ] Llama a \`StockService.recordMovement(ENTRADA)\`
- [ ] Actualiza \`PurchaseOrderItem.receivedQty\` y estado de OC
- [ ] Asigna Costo Provisional al momento de la recepción

## Tareas Técnicas
- [ ] **[Backend]** Migraciones + entidades \`GoodsReceipt\` y \`GoodsReceiptItem\`
- [ ] **[Backend]** \`POST /purchase-orders/:id/receipts\` en transacción TypeORM
- [ ] **[Frontend]** Formulario de recepción con equivalencia en unidades base (read-only)
- [ ] **[QA]** Test: recibir 5 de OC de 10 → OC queda PARCIAL, stock +5×factor

## Invariante
\`receivedQtyBaseUnits = receivedQtyPurchaseUnit × conversionFactor\`

## Entidades
\`GoodsReceipt\`, \`GoodsReceiptItem\`, \`Stock\`, \`StockMovement\``,
  },
  {
    sprint: 4,
    title: "[US-17] Recepción Parcial y Gestión de Backorders",
    body: `## Historia de Usuario
**Como** Administrador, **quiero** que el sistema registre las entregas parciales y me muestre qué pedidos siguen pendientes de recepción.

## Estimación
**1.5 días** | Complejidad: 🟡 Media | Sprint 4

## Criterios de Aceptación
- [ ] \`PendingQty = OrderedQty - ReceivedQty\` por ítem
- [ ] Si \`PendingQty > 0\` → OC en estado \`PARCIAL\`
- [ ] Panel de backorders agrupado por proveedor
- [ ] Badge \`URGENTE\` si han pasado más de 14 días desde la emisión

## Tareas Técnicas
- [ ] **[Backend]** \`GET /purchase-orders/pending\` con \`pendingQty\` por ítem
- [ ] **[Frontend]** Página \`/purchases/backorders\` agrupada por proveedor
- [ ] **[QA]** Test: 3 recepciones parciales → en la tercera la OC pasa a COMPLETADA

## Entidades
\`PurchaseOrder\`, \`PurchaseOrderItem\`, \`GoodsReceipt\``,
  },

  // ── SPRINT 5 — Facturas & Costos ───────────────────────────────────────────
  {
    sprint: 5,
    title: "[US-18] Conciliación Recepción ↔ Factura de Proveedor",
    body: `## Historia de Usuario
**Como** Administrador, **quiero** registrar la factura del proveedor y que el sistema la concilie automáticamente contra la mercadería recibida.

## Estimación
**2.5 días** | Complejidad: 🔴 Alta | Sprint 5

## Criterios de Aceptación
- [ ] **Regla C** — \`Factura > Recepción\`: línea en estado \`OBSERVADA\` → bloquea la factura completa
- [ ] **Regla D** — \`Factura < Recepción\`: remanente queda como \`PENDIENTE_FACTURACION\`
- [ ] Estados de factura: \`BORRADOR → VALIDANDO → OBSERVADA | AUTORIZADA → CONFIRMADA\`

## Tareas Técnicas
- [ ] **[Backend]** Migraciones + entidades \`SupplierInvoice\` y \`SupplierInvoiceItem\`
- [ ] **[Backend]** Lógica de conciliación en \`SupplierInvoiceService\`
- [ ] **[Frontend]** Formulario con tabla comparativa qty recibida vs qty facturada
- [ ] **[QA]** Test: cantidad facturada > recibida → línea y factura quedan OBSERVADA

## Entidades
\`SupplierInvoice\`, \`SupplierInvoiceItem\`, \`GoodsReceipt\``,
  },
  {
    sprint: 5,
    title: "[US-19] Tolerancia de Costos y Facturas Observadas/En Disputa",
    body: `## Historia de Usuario
**Como** Administrador, **quiero** que las diferencias de costo superiores a una tolerancia configurable bloqueen la factura hasta mi autorización explícita.

## Estimación
**1.5 días** | Complejidad: 🟡 Media | Sprint 5

## Criterios de Aceptación
- [ ] Si \`|ΔCosto%| > tolerancia configurada\` → estado \`OBSERVADA\` (no genera deuda en CtaCte)
- [ ] Tolerancia configurable desde \`SystemConfig\` (default: 5%)
- [ ] Flujo: Autorizar (→ AUTORIZADA) | Rechazar (con motivo)
- [ ] Solo ADMINISTRADOR puede autorizar/rechazar

## Tareas Técnicas
- [ ] **[Backend]** Lógica de tolerancia en \`SupplierInvoiceService\` leyendo \`SystemConfig\`
- [ ] **[Backend]** \`PATCH /supplier-invoices/:id/authorize\` y \`reject\` (ADMIN only)
- [ ] **[Frontend]** Banner de alerta en facturas OBSERVADA con Δ% vs tolerancia
- [ ] **[QA]** Test: 6% diff con tolerancia 5% → OBSERVADA. 4% diff → AUTORIZADA

## Entidades
\`SupplierInvoice\`, \`SystemConfig\``,
  },
  {
    sprint: 5,
    title: "[US-20] Algoritmo de Ajuste Retroactivo de Costos e Inventario",
    body: `## Historia de Usuario
**Como** sistema, **quiero** redistribuir las diferencias entre costo provisional y definitivo afectando la valorización de inventario (revaluación) y el COGS histórico (ajuste de margen).

## Estimación
**3 días** | Complejidad: 🔴 Alta | Sprint 5

## Algoritmo
\`\`\`
ΔCostUnit = realCostUnit - provisionalCostUnit
stockEnMano = Stock.currentBaseStock (al momento del ajuste)
unidadesVendidas = totalRecibidas - stockEnMano

revaluacionInventario = stockEnMano × ΔCostUnit
ajusteCOGS          = unidadesVendidas × ΔCostUnit
\`\`\`

## Criterios de Aceptación
- [ ] Actualiza \`Product.costNet\` al costo real definitivo
- [ ] Crea \`SupplierCostAdjustment\` con los resultados detallados
- [ ] Dispara \`PriceReview\` (PENDIENTE) para cada producto afectado
- [ ] No modifica automáticamente \`Product.activePriceNet\`

## Tareas Técnicas
- [ ] **[Backend]** Algoritmo en \`SupplierInvoiceService\` al confirmar factura
- [ ] **[Backend]** Entidad \`SupplierCostAdjustment\`
- [ ] **[Backend]** Creación de \`PriceReview\` pendiente para productos afectados
- [ ] **[Frontend]** Sección "Ajuste de Costos" en detalle de factura CONFIRMADA
- [ ] **[QA]** Test: 100 ud a $10, vender 30, factura real $11 → revaluación = 70×$1 = $70

## Entidades
\`SupplierCostAdjustment\`, \`SupplierInvoice\`, \`Product\`, \`PriceReview\``,
  },

  // ── SPRINT 6 — Precios & Clientes ──────────────────────────────────────────
  {
    sprint: 6,
    title: "[US-21] Cálculo de Precio Sugerido y Jerarquía de Markups",
    body: `## Historia de Usuario
**Como** sistema, **quiero** calcular el precio sugerido para cada producto aplicando la jerarquía de markups configurada.

## Estimación
**1.5 días** | Complejidad: 🟡 Media | Sprint 6

## Fórmula
\`Precio Sugerido = Costo Neto × (1 + Markup%)\`

## Jerarquía (mayor prioridad primero)
1. Markup de Producto (específico al producto)
2. Markup de Categoría
3. Markup Global

## Criterios de Aceptación
- [ ] \`MarkupService.getEffectiveMarkup(productId)\` respeta la jerarquía
- [ ] \`GET /products/:id/suggested-price\` devuelve precio, markup aplicado y nivel
- [ ] Markup de producto (25%) overrides categoría (20%) overrides global (15%)

## Tareas Técnicas
- [ ] **[Backend]** Migración + entidad \`MarkupConfiguration\`
- [ ] **[Backend]** \`MarkupService.getEffectiveMarkup()\` y \`calculateSuggestedPrice()\`
- [ ] **[Frontend]** Página \`/admin/markups\` con 3 secciones: Global / por Categoría / por Producto
- [ ] **[QA]** Test: jerarquía de markup correcta en los 3 niveles

## Entidades
\`MarkupConfiguration\`, \`Product\``,
  },
  {
    sprint: 6,
    title: "[US-22] Bandeja de Revisión de Precios (Aprobación Manual Obligatoria)",
    body: `## Historia de Usuario
**Como** Administrador, **quiero** revisar los cambios de precio sugeridos y decidir si los aplico, modifico o pospongo.

## Estimación
**1.5 días** | Complejidad: 🟡 Media | Sprint 6

## ⚠️ Regla Invariable
**El sistema NUNCA modifica automáticamente \`Product.activePriceNet\`.** Siempre requiere decisión manual del Administrador.

## Criterios de Aceptación
- [ ] Acciones disponibles: Aprobar | Aprobar con precio custom | Rechazar | Posponer
- [ ] Al Aprobar: \`Product.activePriceNet\` se actualiza, se registra en AuditLog
- [ ] Al Rechazar: \`Product.activePriceNet\` NO se modifica
- [ ] Badge en sidebar con count de revisiones pendientes

## Tareas Técnicas
- [ ] **[Backend]** Migración + entidad \`PriceReview\`
- [ ] **[Backend]** \`PATCH /price-reviews/:id/approve\`, \`reject\`, \`postpone\`
- [ ] **[Frontend]** Página \`/prices/review\` con tabla de PENDIENTES y edición inline de precio custom
- [ ] **[QA]** Test: aprobar actualiza \`activePriceNet\`; rechazar NO lo modifica

## Entidades
\`PriceReview\`, \`Product\``,
  },
  {
    sprint: 6,
    title: "[US-23] CRUD de Clientes y Límites de Crédito",
    body: `## Historia de Usuario
**Como** Vendedor o Administrador, **quiero** gestionar los datos de clientes incluyendo su límite de crédito y condición fiscal.

## Estimación
**1 día** | Complejidad: 🟢 Baja | Sprint 6

## Criterios de Aceptación
- [ ] Campos: Nombre/Razón Social, DNI/CUIT, Condición Fiscal, Dirección, Teléfono, Email, Límite de Crédito, Descuento Especial %
- [ ] CUIT único en el sistema
- [ ] Soft-delete (no eliminar clientes con historial)

## Tareas Técnicas
- [ ] **[Backend]** Migración + entidad \`Customer\`
- [ ] **[Backend]** \`CustomersModule\` CRUD con soft-delete y validación CUIT único
- [ ] **[Frontend]** Página \`/customers\` con tabla + modal formulario
- [ ] **[QA]** Test: CUIT duplicado → error 422

## Entidades
\`Customer\``,
  },
  {
    sprint: 6,
    title: "[US-24] Precios Especiales y Descuentos por Cliente",
    body: `## Historia de Usuario
**Como** Administrador, **quiero** configurar precios especiales por cliente y producto para manejar acuerdos comerciales particulares.

## Estimación
**1.5 días** | Complejidad: 🟡 Media | Sprint 6

## Jerarquía de Precio Final (mayor prioridad primero)
1. \`CustomerSpecialPrice\` (precio específico producto-cliente)
2. \`activePriceNet × (1 - specialDiscountPercentage)\` (descuento % global del cliente)
3. \`activePriceNet\` (precio de catálogo)

## Criterios de Aceptación
- [ ] CRUD de precios especiales por cliente y producto
- [ ] \`CustomerPricingService.getFinalPrice(customerId, productId)\` respeta la jerarquía
- [ ] El POS aplica automáticamente el precio final correcto

## Tareas Técnicas
- [ ] **[Backend]** Migración + entidad \`CustomerSpecialPrice\`
- [ ] **[Backend]** \`CustomerPricingService.getFinalPrice()\`
- [ ] **[Frontend]** Sub-sección en detalle de cliente con tabla de precios especiales
- [ ] **[QA]** Test: precio especial ($100) tiene prioridad sobre catálogo ($120) con desc 10%

## Entidades
\`CustomerSpecialPrice\`, \`Customer\`, \`Product\``,
  },

  // ── SPRINT 7 — POS ─────────────────────────────────────────────────────────
  {
    sprint: 7,
    title: "[US-25] Punto de Venta y Validación Transaccional de Venta",
    body: `## Historia de Usuario
**Como** Vendedor, **quiero** cargar una venta con múltiples productos, seleccionar el cliente, el medio de pago y confirmarla, sabiendo que el stock y la CtaCte se actualizarán automáticamente.

## Estimación
**3 días** | Complejidad: 🔴 Alta | Sprint 7

## ⚠️ Regla Crítica
**Venta a CRÉDITO → SIEMPRE requiere Factura Fiscal** (checkbox bloqueado en UI, validado en backend).

## Transacción Atómica (TypeORM QueryRunner)
\`\`\`
BEGIN
  INSERT Sale (status: CONFIRMADA)
  FOR each item:
    SELECT stock FOR UPDATE
    VALIDATE stock >= quantity (→ ROLLBACK si falla)
    INSERT StockMovement(SALIDA)
    UPDATE Stock.currentBaseStock
  INSERT FiscalDocument { status: PENDIENTE_FACTURACION }
  IF creditSale: INSERT AccountReceivable
COMMIT
\`\`\`

## Criterios de Aceptación
- [ ] Venta a Crédito fuerza Factura Fiscal (UI y backend)
- [ ] Si stock insuficiente en algún ítem → rechaza toda la venta (HTTP 422)
- [ ] La transacción es completamente atómica (todo o nada)

## Tareas Técnicas
- [ ] **[Backend]** Migraciones + entidades \`Sale\` y \`SaleItem\`
- [ ] **[Backend]** \`POST /sales\` con \`QueryRunner\` y \`setLock('pessimistic_write')\`
- [ ] **[Frontend]** POS de dos paneles (ítems izquierda, cliente + pago + totales derecha)
- [ ] **[Frontend]** Validación UI: crédito → factura obligatoria
- [ ] **[QA]** Tests: crédito sin factura (rechazado), stock insuficiente (rechazado)

## Entidades
\`Sale\`, \`SaleItem\`, \`FiscalDocument\`, \`Stock\`, \`StockMovement\`, \`AccountReceivable\``,
  },
  {
    sprint: 7,
    title: "[US-28] Devoluciones de Clientes y Control de Calidad",
    body: `## Historia de Usuario
**Como** Vendedor, **quiero** registrar devoluciones de clientes especificando el resultado de la inspección de calidad para cada ítem devuelto.

## Estimación
**2 días** | Complejidad: 🔴 Alta | Sprint 7

## Criterios de Aceptación
- [ ] **APTO**: Reingresa a Stock Disponible + stub Nota de Crédito (real en Sprint 8)
- [ ] **NO APTO**: Va a \`QuarantineStock\` (nunca vuelve sin autorización ADMIN)
- [ ] Cantidad devuelta no puede superar la cantidad vendida original

## Tareas Técnicas
- [ ] **[Backend]** \`POST /sales/:id/returns\` con \`qualityResult: APTO | NO_APTO\` por ítem
- [ ] **[Backend]** Si APTO: \`StockService.recordMovement(DEVOLUCION)\`
- [ ] **[Backend]** Si NO APTO: \`INSERT QuarantineStock\`
- [ ] **[Frontend]** Sección "Registrar Devolución" en detalle de venta CONFIRMADA
- [ ] **[QA]** Test: 5 APTAS → stock+5; 3 NO APTAS → cuarentena, stock no cambia

## Entidades
\`Sale\`, \`SaleItem\`, \`Stock\`, \`StockMovement\`, \`QuarantineStock\``,
  },

  // ── SPRINT 8 — ARCA ─────────────────────────────────────────────────────────
  {
    sprint: 8,
    title: "[US-26] Integración ARCA: Emisión de Comprobantes Fiscales (A/B, NC/ND)",
    body: `## Historia de Usuario
**Como** sistema, **quiero** conectarme con ARCA (WSAA + WSFE) para emitir Facturas A/B con CAE y generar el PDF oficial con QR de AFIP.

## Estimación
**4 días** | Complejidad: 🔴 Alta | Sprint 8

## Flujo de Emisión (BullMQ)
\`\`\`
POST /sales (confirm)
  → INSERT FiscalDocument { status: PENDIENTE_FACTURACION }
  → ENQUEUE arca-queue { idempotencyKey: saleId }
      → [Worker] ArcaWsfeService.FECAESolicitar()
      → [Success] UPDATE FiscalDocument { cae, caeExpiration, status: EMITIDO }
      → ENQUEUE pdf-generate
          → [Worker] Puppeteer → HTML template + QR → PDF file
\`\`\`

## Criterios de Aceptación
- [ ] Firma digital con certificado X.509 (.p12)
- [ ] Tipos soportados: Factura A, Factura B, NC A/B, ND A/B
- [ ] CAE y fecha de vencimiento guardados en \`FiscalDocument\`
- [ ] PDF descargable con QR de AFIP embebido

## QR AFIP
\`https://www.afip.gob.ar/fe/qr/?p={base64(json)}\`

## Tareas Técnicas
- [ ] **[Backend]** \`ArcaAuthService\`: lee .p12, genera CMS firmado, llama WSAA, cachea Token+Sign en Redis (12h TTL)
- [ ] **[Backend]** \`ArcaWsfeService.FECAESolicitar()\` y \`FECompConsultar()\`
- [ ] **[Backend]** BullMQ worker \`wsfe-emit\` con \`idempotencyKey = saleId\`
- [ ] **[Backend]** BullMQ worker \`pdf-generate\` (Puppeteer + template HTML + \`qrcode\` npm)
- [ ] **[Frontend]** Sección "Comprobante Fiscal" en detalle de venta
- [ ] **[QA]** Test en homologación: emitir Factura B real, verificar CAE válido, abrir PDF

## Servicios AFIP
- WSAA: \`https://wsaa.afip.gov.ar/ws/services/LoginCms\`
- WSFE: \`https://servicios1.afip.gov.ar/wsfev1/service.asc\`

## Entidades
\`FiscalDocument\`, \`Sale\``,
  },
  {
    sprint: 8,
    title: "[US-27] Manejo de Contingencias y Reconexión ARCA (Anti-Duplicado)",
    body: `## Historia de Usuario
**Como** sistema, **quiero** gestionar las caídas de comunicación con ARCA sin duplicar comprobantes fiscales ni cancelar la venta interna.

## Estimación
**2 días** | Complejidad: 🔴 Alta | Sprint 8

## Escenario A — Fallo Pre-CAE
ARCA no llegó a procesar la solicitud.
→ \`FiscalDocument.arcaStatus = PENDIENTE_FACTURACION\`
→ La venta interna sigue \`CONFIRMADA\`
→ BullMQ reintenta con backoff exponencial (30s, 60s, 120s, 240s, 480s)

## Escenario B — Fallo Post-CAE ⚠️ CRÍTICO
La conexión se perdió DESPUÉS de que AFIP procesó la solicitud pero ANTES de recibir la respuesta.
→ **Antes de reintentar**: llamar \`FECompConsultar\` para verificar si ya existe
→ Si YA existe → tomar el CAE sin re-emitir (previene duplicado fiscal)
→ Si NO existe → emitir normalmente

## Criterios de Aceptación
- [ ] Backoff exponencial: 5 intentos máximo
- [ ] Escenario B implementado: \`FECompConsultar\` siempre antes del retry
- [ ] Tras 5 fallos: \`arcaStatus = RECHAZADO\`, notificar admin
- [ ] Panel \`/admin/fiscal-alerts\` con comprobantes PENDIENTE/RECHAZADO

## Tareas Técnicas
- [ ] **[Backend]** BullMQ retry: \`attempts: 5, backoff: { type: 'exponential', delay: 30000 }\`
- [ ] **[Backend]** Lógica de \`FECompConsultar\` en el retry handler (Escenario B)
- [ ] **[Frontend]** Panel \`/admin/fiscal-alerts\` con botón "Reintentar Manualmente"
- [ ] **[QA]** Test: mock ARCA que falla 3 veces y tiene éxito en la 4ta → CAE obtenido

## Entidades
\`FiscalDocument\`, \`Sale\``,
  },

  // ── SPRINT 9 — CtaCte & Cheques ─────────────────────────────────────────────
  {
    sprint: 9,
    title: "[US-29] Cuenta Corriente de Clientes por Movimientos",
    body: `## Historia de Usuario
**Como** Administrador, **quiero** consultar el estado de cuenta corriente de un cliente con el detalle de todos sus movimientos.

## Estimación
**2 días** | Complejidad: 🟡 Media | Sprint 9

## Invariante de Dominio
\`currentBalance = originalAmount - Σ(allocations) + Σ(reversals)\`

## Criterios de Aceptación
- [ ] Ledger: Facturas (+), Pagos (-), Notas de Crédito (-), Reversiones (+)
- [ ] Se crea automáticamente un \`AccountReceivable\` al confirmar una venta a crédito
- [ ] Exportación a PDF del resumen de cuenta

## Tareas Técnicas
- [ ] **[Backend]** Migraciones + entidades \`AccountReceivable\` y \`AccountReceivableMovement\`
- [ ] **[Backend]** Trigger post-venta crédito en \`SaleService\`
- [ ] **[Backend]** \`GET /customers/:id/account-receivable\`
- [ ] **[Frontend]** Tab "Cuenta Corriente" en detalle de cliente
- [ ] **[Frontend]** Exportación PDF del resumen
- [ ] **[QA]** Test: 3 ventas crédito → \`currentBalance = suma de las 3\`

## Entidades
\`AccountReceivable\`, \`AccountReceivableMovement\`, \`Sale\``,
  },
  {
    sprint: 9,
    title: "[US-30] Cobranzas, Aplicación de Pagos y Emisión de Recibos",
    body: `## Historia de Usuario
**Como** Administrador, **quiero** registrar cobros a clientes aplicándolos a facturas específicas o automáticamente por antigüedad, y que el sistema genere el recibo automáticamente.

## Estimación
**2.5 días** | Complejidad: 🔴 Alta | Sprint 9

## Criterios de Aceptación
- [ ] **Aplicación Dirigida**: el admin selecciona las facturas específicas a cancelar
- [ ] **Aplicación por Antigüedad**: cascade automático de la más antigua a la más nueva
- [ ] Recibo generado e imprimible obligatorio por cada cobro
- [ ] Medios de pago: Efectivo, Transferencia, Cheque (combinables en un mismo cobro)

## Tareas Técnicas
- [ ] **[Backend]** Migraciones + entidades \`Payment\`, \`PaymentAllocation\`, \`Receipt\`
- [ ] **[Backend]** \`POST /payments\` con lógica de allocations y generación de \`Receipt\`
- [ ] **[Backend]** \`GET /receipts/:id/pdf\` (Puppeteer)
- [ ] **[Frontend]** Formulario de cobro con tabla de facturas + medios de pago
- [ ] **[QA]** Test: pago $1500 dirigido a 2 facturas ($1000 + $500) → ambas CANCELADAS

## Entidades
\`Payment\`, \`PaymentAllocation\`, \`Receipt\`, \`AccountReceivable\``,
  },
  {
    sprint: 9,
    title: "[US-31] Ciclo de Vida Completo de Cheques",
    body: `## Historia de Usuario
**Como** Administrador, **quiero** registrar los cheques recibidos de clientes y gestionar sus estados hasta su cobro o endoso.

## Estimación
**2 días** | Complejidad: 🟡 Media | Sprint 9

## Máquina de Estados
\`\`\`
RECIBIDO → EN_CARTERA → DEPOSITADO
                      → ENDOSADO (con endorsedToSupplierId)
                      → RECHAZADO (→ ver US-32)
\`\`\`

## Criterios de Aceptación
- [ ] Datos: Banco, N° Cheque, Librador, Monto, Fecha Emisión, Fecha Vencimiento
- [ ] Los cheques se registran durante el flujo de cobro (US-30)
- [ ] Transiciones inválidas rechazadas (ej: DEPOSITADO → EN_CARTERA)
- [ ] Alerta: cheques a vencer en ≤7 días

## Tareas Técnicas
- [ ] **[Backend]** Migración + entidad \`Check\`
- [ ] **[Backend]** Endpoints de transición de estado
- [ ] **[Frontend]** Página \`/treasury/checks\` con filtros y acciones por estado
- [ ] **[QA]** Test: transición inválida rechazada con error descriptivo

## Entidades
\`Check\`, \`Payment\``,
  },
  {
    sprint: 9,
    title: "[US-32] Reversión Transaccional por Cheque Rechazado",
    body: `## Historia de Usuario
**Como** sistema, **quiero** que al registrar el rechazo de un cheque, la deuda del cliente se reinstauree automáticamente y de forma atómica.

## Estimación
**2 días** | Complejidad: 🔴 Alta | Sprint 9

## Transacción Atómica (TypeORM QueryRunner)
\`\`\`
BEGIN
  Check.status → RECHAZADO
  FOR each AccountReceivable cancelada por ese pago:
    currentBalance = originalAmount
    status → PENDIENTE
    INSERT AccountReceivableMovement(REVERSION_CHEQUE)
  Payment.status → REVERTIDO
  INSERT AuditLog
COMMIT
\`\`\`

## Criterios de Aceptación
- [ ] La transacción es completamente atómica (todo o nada)
- [ ] Las facturas vuelven a PENDIENTE con el saldo original
- [ ] Modal de confirmación muestra el impacto antes de ejecutar

## Tareas Técnicas
- [ ] **[Backend]** \`PATCH /checks/:id/reject\` en transacción TypeORM atómica
- [ ] **[Frontend]** Botón "Registrar Rechazo" con modal de impacto
- [ ] **[QA]** Test: cheque $1000 rechazado → facturas vuelven a PENDIENTE con saldo original

## Entidades
\`Check\`, \`Payment\`, \`AccountReceivable\`, \`AccountReceivableMovement\``,
  },

  // ── SPRINT 10 — Tesorería & Reportes ────────────────────────────────────────
  {
    sprint: 10,
    title: "[US-33] Caja Chica y Arqueo Físico",
    body: `## Historia de Usuario
**Como** Administrador, **quiero** gestionar la caja chica y realizar arqueos físicos para detectar diferencias entre el saldo esperado y el dinero contado.

## Estimación
**1.5 días** | Complejidad: 🟡 Media | Sprint 10

## Criterios de Aceptación
- [ ] Log inmutable de diferencias de arqueo en AuditLog
- [ ] Solo una caja abierta a la vez
- [ ] Registro manual de ingresos/egresos de caja con motivo

## Tareas Técnicas
- [ ] **[Backend]** Migraciones + entidades \`CashRegister\` y \`TreasuryMovement\`
- [ ] **[Backend]** \`POST /cash-register/open\` y \`POST /cash-register/close\`
- [ ] **[Frontend]** Página con estado abierta/cerrada y formulario de arqueo
- [ ] **[QA]** Test: diferencia de arqueo registrada en AuditLog

## Entidades
\`CashRegister\`, \`TreasuryMovement\``,
  },
  {
    sprint: 10,
    title: "[US-34] Desglose de Tesorería (Efectivo, Bancos, Cheques)",
    body: `## Historia de Usuario
**Como** Administrador, **quiero** ver el saldo consolidado de tesorería dividido por canal para saber exactamente dónde está el dinero.

## Estimación
**1 día** | Complejidad: 🟢 Baja | Sprint 10

## Criterios de Aceptación
- [ ] Tres canales: Efectivo, Bancos/Transferencias, Cheques en Cartera
- [ ] Saldos calculados desde movimientos (no campo estático)
- [ ] Movimientos recientes con filtros

## Tareas Técnicas
- [ ] **[Backend]** \`TreasuryAccount\` seeds + \`GET /treasury/summary\`
- [ ] **[Frontend]** Página \`/treasury\` con 3 cards + tabla de movimientos recientes

## Entidades
\`TreasuryAccount\`, \`TreasuryMovement\``,
  },
  {
    sprint: 10,
    title: "[US-35] Dashboard de KPIs Ejecutivos",
    body: `## Historia de Usuario
**Como** Administrador, **quiero** ver al ingresar al sistema un panel con los indicadores clave del negocio del día.

## Estimación
**0.5 días** | Complejidad: 🟡 Media | Sprint 10

## KPIs requeridos
| KPI | Origen | Link |
|-----|--------|------|
| Ventas del día ($) | \`Sale\` | \`/sales\` |
| Ventas del mes ($) | \`Sale\` | \`/sales\` |
| Productos bajo mínimo | \`Stock\` | \`/stock?filter=alerts\` |
| Facturas prov. OBSERVADAS | \`SupplierInvoice\` | \`/purchases/supplier-invoices?status=OBSERVADA\` |
| Cheques a vencer en 7 días | \`Check\` | \`/treasury/checks\` |

## Tareas Técnicas
- [ ] **[Backend]** \`GET /dashboard/kpis\` con queries agregadas
- [ ] **[Frontend]** Página \`/dashboard\` (home): 5 KPI cards clickeables`,
  },
  {
    sprint: 10,
    title: "[US-36] Export Engine Centralizado (Excel + PDF)",
    body: `## Historia de Usuario
**Como** sistema, **quiero** tener un servicio centralizado de exportación reutilizable por todos los módulos de reportes.

## Estimación
**0.5 días** | Complejidad: 🟢 Baja | Sprint 10

## Tareas Técnicas
- [ ] **[Backend]** \`ExportService.toExcel(title, columns[], rows[])\` → Buffer (SheetJS)
- [ ] **[Backend]** \`ExportService.toPdf(htmlContent)\` → Buffer (Puppeteer)
- [ ] **[Backend]** \`ReportsController\` genérico: \`GET /reports/:type?format=excel|pdf\``,
  },
  {
    sprint: 10,
    title: "[US-37 a US-45] Reportes Operativos (9 reportes)",
    body: `## Historia de Usuario
**Como** Administrador, **quiero** generar reportes operativos exportables en Excel y PDF para análisis del negocio.

## Estimación
**~3 días total** | Complejidad: 🟡 Media | Sprint 10

## Reportes incluidos

| US | Reporte | Filtros principales | Columnas clave |
|----|---------|---------------------|----------------|
| US-37 | Ventas por Período | Fecha, cliente, medio pago | N° Venta, Cliente, Ítems, Total, Factura |
| US-38 | Rentabilidad por Producto | Fecha, categoría | Producto, Costo, Precio, Margen $, Margen % |
| US-39 | Stock Actual y Valorización | Categoría, estado | Producto, Stock, Costo, Valor Total |
| US-40 | Movimientos de Stock | Fecha, producto, tipo | Fecha, Tipo, Cantidad, Stock Ant/Post |
| US-41 | Compras por Proveedor | Fecha, proveedor | OC, Proveedor, Monto, Estado |
| US-42 | Aging de Cuentas Corrientes | Cliente, estado | Cliente, 0-30d, 31-60d, +60d, Total |
| US-43 | Cobranzas y Recibos | Fecha, cliente | Recibo, Cliente, Total Cobrado, Medio Pago |
| US-44 | Cheques en Cartera | Estado, vencimiento | Banco, N°, Librador, Monto, Vencimiento |
| US-45 | Facturas Prov. Observadas | Proveedor, estado | Factura, Proveedor, Δ Costo%, Estado |

## Patrón común (todos los reportes)
\`\`\`
Formulario de filtros → [ Generar ] → tabla preview → [ Exportar Excel ] [ Exportar PDF ]
\`\`\``,
  },
  {
    sprint: 10,
    title: "[US-46] Configuración General del Sistema",
    body: `## Historia de Usuario
**Como** Administrador, **quiero** configurar los parámetros globales del sistema desde la UI sin modificar el código.

## Estimación
**0.5 días** | Complejidad: 🟢 Baja | Sprint 10

## Parámetros configurables
| Clave | Default | Descripción |
|-------|---------|-------------|
| \`cost_tolerance_percentage\` | 5 | % tolerancia diferencia de costos en facturas proveedor |
| \`arca_punto_venta\` | 1 | Número de punto de venta ARCA |
| \`issuer_razon_social\` | — | Razón social del emisor de comprobantes |
| \`issuer_cuit\` | — | CUIT del emisor |
| \`issuer_tax_condition\` | RESPONSABLE_INSCRIPTO | Condición fiscal |

## Tareas Técnicas
- [ ] **[Backend]** Migración + entidad \`SystemConfig\` (key-value store inmutable)
- [ ] **[Backend]** Seed con defaults. \`GET /config\` y \`PATCH /config\` (solo ADMIN)
- [ ] **[Frontend]** Página \`/admin/config\` con formulario editable

## Entidades
\`SystemConfig\``,
  },
  {
    sprint: 10,
    title: "QA Final, Deploy a Producción & Go-Live",
    body: `## Descripción
QA final del sistema completo y deploy a producción en Hetzner CX21.

## Estimación
**~1 día** | Sprint 10

## Checklist de Go-Live

### QA
- [ ] Smoke test flujo ventas: Venta → Stock → ARCA → CtaCte → Cobro → Recibo
- [ ] Smoke test flujo compras: OC → Recepción → Factura → Ajuste Costos → Bandeja Precios
- [ ] Suite completa de tests (\`pnpm -r run test\`) pasando
- [ ] Verificar todos los reportes generan Excel y PDF correctamente

### Deploy
- [ ] Servidor Hetzner CX21 (Ubuntu 24.04) provisionado
- [ ] Docker Compose configurado en producción
- [ ] Nginx + Certbot SSL configurado (dominio del cliente)
- [ ] Variables de entorno de producción configuradas
- [ ] Certificado ARCA \`.p12\` en \`/secrets/\` del servidor (FUERA del repositorio)
- [ ] Migraciones ejecutadas: \`pnpm --filter backend run migration:run\`
- [ ] Seed de usuario admin ejecutado
- [ ] Backup automático PostgreSQL (\`pg_dump\` diario via cron)

### Entrega
- [ ] Demo con datos reales del cliente
- [ ] Manual básico de operación entregado
- [ ] Período de garantía de 30 días iniciado

## 💰 Hito de Pago #4 (25% final del contrato)`,
  },
];

// =============================================================================
// MAIN
// =============================================================================
async function main() {
  console.log(`\n🚀 Creando ${issues.length} issues en ${OWNER}/${REPO}...\n`);

  // Mapa de sprint number → issue number del parent (ya creados)
  const sprintParentNumbers = SPRINT_ISSUE_NUMBERS;

  let created = 0;
  let failed  = 0;

  for (const item of issues) {
    try {
      // 1. Crear la issue
      const { number: childNumber } = await createIssue(item.title, item.body);
      created++;

      // 2. Linkear como sub-issue del sprint parent
      const parentNumber = sprintParentNumbers[item.sprint];
      if (parentNumber) {
        await addSubIssue(parentNumber, childNumber);
      }

      // Rate limit: esperar 1.5s entre requests
      await sleep(1500);

    } catch (err) {
      console.error(`  ❌ Error: ${err.message}`);
      failed++;
      await sleep(2000);
    }
  }

  console.log(`\n✅ Completado: ${created} issues creadas, ${failed} errores.`);
  console.log(`\n🔗 Ver en: https://github.com/${OWNER}/${REPO}/issues`);
}

main().catch(console.error);
