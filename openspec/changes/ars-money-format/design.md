# Design

## Context

Hoy conviven cinco formateadores (`formatCurrency` ×2, `formatMoneyAr`, `formatSignedMoneyAr`, `formatPriceReviewMoney`), con comportamientos distintos ante vacío (`—` vs `$ 0,00`) y algunos con `parseFloat`/`Number` (flotante). No existe `shared/` en el frontend: los helpers transversales viven en `src/lib/` y los componentes base en `src/components/ui/`. Los inputs de monto son `type="number"` (ProductForm, SupplierProductFormModal, ResolveUnknownDrawer) o `type="text" inputMode="decimal"` (CloseCashForm, OpenCashForm, pagos, tesorería, facturas de proveedor, etc.). Costos netos son `numeric(12,4)`, precios `numeric(12,2)`, totales `numeric(14,2)`.

## Goals / Non-Goals

**Goals:**
- Un solo módulo de formato/parseo de montos, sin aritmética con `number`.
- Un solo `MoneyInput` reutilizable, compatible con react-hook-form (`value`/`onChange` con string crudo).
- Migración incremental por feature con PRs/commits revisables.

**Non-Goals:**
- Formateo de cantidades, stock, porcentajes, fechas.
- Cambios de backend, API o esquema.
- Conversión de número a palabras en español.

## Decisions

1. **`src/lib/money.ts`** exporta: `formatCurrency(value, { decimals?, signed? })`, `formatMoneyInput(raw, decimals)` (crudo → texto con miles) y `parseMoneyInput(text, decimals, max?)` (texto → crudo). Alternativa descartada: carpeta `src/shared/` nueva (rompe la estructura).
2. **Aritmética con `Decimal`**: `formatCurrency` convierte con `new Decimal(String(v))` y arma el texto con `toFixed` + agrupación de miles; no pasa por `number`. Alternativa: `Intl.NumberFormat` directo (descartada: pierde precisión > 2^53 y con 4 decimales). Se mantiene la salida `es-AR` y el prefijo `$ ` (espacio normal, no NBSP, para que los tests sean estables).
3. **Valor vacío/inválido → `—`** en todas las vistas (unifica el criterio de products; purchase-orders hoy devuelve `$ 0,00` y se ajusta, verificando sus specs).
4. **Signo**: `formatCurrency` preserva `-`; la variante con signo explícito (`+$`/`-$`, hoy `formatSignedMoneyAr`) se expresa con la opción `signed: true`.
5. **Parser del input**: acepta solo dígitos, una coma decimal y (si `allowNegative`) un `-` inicial; el punto se trata como separador de miles y se descarta (pegado `1.500.000,5` y `1500000.5` con un solo punto seguido de ≠3 dígitos se interpreta como decimal para tolerar pegados con punto). Recorta decimales al máximo y rechaza si supera `max` (conserva el último valor válido).
6. **Cursor**: el componente cuenta los dígitos a la izquierda del cursor antes de reformatear y restaura la posición tras el render (`useLayoutEffect`). Alternativa: librería de máscaras (descartada: no se instalan dependencias).
7. **`MoneyInput`** extiende `Input` existente: props `value` (string crudo), `onValueChange(raw)`, `decimals=2`, `max`, `allowNegative=false`, `showMagnitude=true`. Prefijo `$` visual, `text-right`, `inputMode="decimal"`. Ayuda de magnitud con `Intl.NumberFormat('es-AR', { notation: 'compact' })` solo con `|valor| ≥ 1000`; se calcula sobre `Decimal` convertido a `number` únicamente para esta ayuda visual (no se envía a ningún lado).
8. **Tope por defecto** `max = 99999999999999.99` (coherente con `numeric(14,2)`); formularios con columnas menores pasan su `max` (p. ej. costos `numeric(12,4)` → `99999999.9999`).
9. **Migración por feature** en este orden: lib + componente + tests → products/supplier-products/importer → cash-register/treasury → payments/supplier-invoices/purchase-orders → customers/customer-pricing/prices/price-reviews → resto de vistas y limpieza de duplicados. Cierre con grep de `toLocaleString`/`Intl.NumberFormat` sin usos sueltos de montos.

## Risks / Trade-offs

- [Cursor salta al reformatear] → test de componente con inserción/borrado en medio y pegado.
- [Cambiar `type="number"` a texto rompe tests existentes que usan `getByRole('spinbutton')`] → actualizar esos tests a `textbox`/label.
- [Purchase-orders cambia de `$ 0,00` a `—` para vacío] → revisar specs/tests del feature y ajustarlos explícitamente.
- [`toLocaleString` mezcla montos con cantidades] → solo se reemplazan los de montos; cantidades de stock quedan.
- [Precisión 4 decimales en costos] → prop `decimals`, vistas de costo pasan `decimals: 4` donde hoy se muestran 4.
