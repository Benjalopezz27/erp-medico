# Design

## Context

Frontend React 19 + Vite + Tailwind 3 + TanStack Router. `Sidebar.tsx` define `navigationEntries` con grupos acordeón, `AppShell` usa `lg:static` y `Topbar` contiene usuario/logout. Los radios están hardcodeados (~266 `rounded-xl`, ~232 `rounded-lg`) y no hay fuente declarada. Ya existe el patrón de navegación por tabs-link en `PurchasesNavigationTabs`. Ver proposal.md para motivación.

## Goals / Non-Goals

**Goals:**

- Cambio visual global con mínimo diff por archivo.
- Sidebar plano, colapsable y sin regresiones de permisos ni rutas.

**Non-Goals:**

- Ordenar tablas, dead clicks, `BackLink`, 404/403/500 (changes 3-5).
- Modo oscuro del sidebar; cambios de backend o rutas.

## Decisions

- **Fuente con `@fontsource/poppins`** (importando solo los 4 pesos) en vez de Google Fonts: self-hosted, sin CDN ni problema de privacidad/offline. Se registra en `tailwind.config.js` como `fontFamily.sans` con fallback a `system-ui`.
- **Radios por override de `theme.borderRadius`** (`lg`, `xl`, `2xl`) en vez de editar cientos de clases: un solo punto cubre lo hardcodeado. Se ajustan además las primitivas que usan `rounded-md`/`rounded-lg` para llegar a `xl`/`2xl`. Alternativa descartada: codemod masivo (diff enorme, riesgo de conflictos).
- **Datos de navegación en un array plano por secciones** (`{ label, items[] }`). El filtrado por `isRouteAllowed` se mantiene y las secciones vacías se omiten. Se eliminan estado de acordeón y `expandedGroupId`.
- **Ítems activos con `matchPrefixes`** para que rutas hijas resalten al padre: Productos → `/prices`, Proveedores → `/importer`, Clientes → `/receivables` y `/payments`, Tesorería → `/treasury/*`.
- **Colapso con estado en `AppShell`** (`collapsed`, init desde `localStorage`, con try/catch) pasado a `Sidebar`. Transición `transition-[width] duration-200`; etiquetas con `opacity` y `overflow-hidden` para evitar saltos. Tooltip por atributo `title` + `aria-label` (sin librería nueva). En mobile el drawer ignora `collapsed`.
- **Sticky**: `aside` con `lg:sticky lg:top-0 lg:h-screen`; el contenedor raíz pasa a `lg:h-screen lg:overflow-hidden` y `<main>` queda con `overflow-y-auto`.
- **Footer de usuario** movido tal cual desde `Topbar`, reutilizando `sessionTerminator.terminate('user_logout')`. Iniciales derivadas del nombre/email.
- **Tesorería con tabs-link** (`TreasuryNavigationTabs`, mismo patrón que `PurchasesNavigationTabs`) en vez de `tabs.tsx`, porque las tres vistas son rutas separadas y `tabs.tsx` es de estado local. Alternativa descartada: rutas hijas anidadas (más cambio de router sin beneficio).
- **Badges**: el contador de revisión de precios se calcula dentro del botón de Productos (`usePriceReviewPendingCountQuery`); el de alertas fiscales y stock se mantienen en sus ítems. Se conservan los `data-testid` existentes para no romper specs.

## Risks / Trade-offs

- [Cambio global de radios puede romper layouts finos] → Revisión visual de las pantallas principales (ventas/POS, productos, stock, modales) antes del PR.
- [Poppins es más ancha que la fuente anterior y puede desbordar tablas/columnas] → Verificar tablas de montos y encabezados; ajustar `truncate`/anchos puntuales.
- [Poppins no garantiza dígitos tabulares] → Si hay desalineación en montos, aplicar `tabular-nums`/`font-mono` solo en celdas monetarias.
- [Usuarios habituados al menú agrupado] → Los ítems de uso diario quedan primero; las rutas no cambian.
- [Specs existentes referencian textos/estructura del sidebar] → Actualizar `Sidebar.spec` y `Topbar.spec` y correr toda la suite.

## Migration Plan

Solo frontend, sin migraciones. Despliegue normal por `dev`. Rollback: revertir el PR; las rutas y la API no cambian.
