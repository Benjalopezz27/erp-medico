# Design

## Context

Hoy solo `SalesTable` y `SupplierInvoicesTable` tienen `<tr onClick>`; el resto navega desde un `Link` en una celda o desde botones. Existen ~20 "Volver" con textos y destinos propios; `StockDetailHeader`, `SaleDetailView` y `CustomerDetailPage` navegan a la ruta base y pierden filtros, mientras `PurchaseOrderDetailPage` ya usa `history.back()` con respaldo. `KpiCards` renderiza un `Link` de texto dentro de cada tarjeta. Ver proposal.md.

## Goals / Non-Goals

**Goals:** un componente por patrón; accesibilidad por teclado; no romper acciones internas de las filas.

**Non-Goals:** crear pantallas de detalle nuevas (usuarios, cheques, tesorería); rediseñar los listados.

## Decisions

- **`BackLink`**: usa `useCanGoBack()` y `router.history.back()` cuando hay historial interno; si no, renderiza `Link` al `fallback`. Mismo aspecto en ambos casos (flecha + "Volver a …"). Alternativa descartada: siempre `Link` a la ruta base (pierde filtros, que es el problema actual).
- **`ClickableRow`** (`<tr>` con `onActivate`): `tabIndex=0`, `Enter` activa, `cursor-pointer hover:bg-slate-50`, y `onClick` ignora eventos cuyo `target.closest('a,button,input,select,textarea,label')` esté dentro de la fila. Navega con el router (`navigate`), no con `window.location`. `SalesTable` y `SupplierInvoicesTable` migran a este componente para unificar.
- **KPI**: la tarjeta se vuelve `relative` y el `Link` existente se extiende con un pseudo-elemento (`after:absolute after:inset-0`), conservando el texto del enlace y los tests actuales sin envolver la tarjeta en otro `<a>`.
- **Tablas sin detalle** no reciben `ClickableRow`; se verifica que no tengan clases `hover`/`cursor-pointer` engañosas.
- **Migración de "Volver"**: se reemplazan los de pantallas de detalle y formularios simples por `BackLink`; los pasos internos del wizard del importador y los botones "Volver" de modales (cancelar) no cambian.

## Risks / Trade-offs

- [`history.back()` puede salir de la aplicación si el usuario llegó desde fuera] → `useCanGoBack` solo es verdadero con historial interno; si no, se usa el respaldo.
- [Fila clickeable dentro de la cual hay controles] → Regla `closest(...)` con test explícito por tabla con botones.
- [Muchos archivos] → Cambio mecánico, cada tabla/página con su spec y type-check.
