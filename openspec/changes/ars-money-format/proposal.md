# Proposal

## Why

Los montos se muestran con formatos distintos según la vista y se tipean sin separadores (`1500000`). Con 7 dígitos pelados es fácil cargar un cero de más o de menos (precio, costo, pago, cierre de caja) y el error se nota recién después de guardar. Issue #285.

## What Changes

- Un único `formatCurrency` ARS (`$ 1.500.000,00`, `es-AR`) en `apps/frontend/src/lib/money.ts`, usado por todas las vistas de solo lectura.
- Se eliminan los formateadores duplicados: `formatCurrency` (products, purchase-orders), `formatMoneyAr`, `formatSignedMoneyAr`, `formatPriceReviewMoney`, y los `toLocaleString`/`Intl.NumberFormat` que formatean montos.
- Nuevo componente `MoneyInput` (`components/ui/money-input.tsx`): separador de miles al tipear, coma decimal, prefijo `$`, alineado a la derecha, tope máximo, decimales configurables (default 2, costos 4), rechazo de negativos, ayuda de magnitud compacta (`1,5 M`).
- `MoneyInput` entrega al form el valor crudo (`"1500000.5"`), nunca el texto formateado.
- Los inputs de monto (`type="number"` y `inputMode="decimal"` de plata) migran a `MoneyInput`, feature por feature. Cantidad, stock, porcentajes y factores de conversión quedan fuera.
- Sin cambios de backend, API ni modelo de datos.

## Capabilities

### New Capabilities
- `money-formatting`: formato ARS único para mostrar montos y comportamiento de los inputs de monto.

### Modified Capabilities

## Impact

- Frontend únicamente: ~51 archivos usan los formateadores actuales; ~14 formularios tienen inputs de monto.
- Sin nuevas dependencias (`Intl` nativo + `decimal.js` ya instalado).
- Respeta `docs/decimal_policy.md`: el formato es solo presentación, sin aritmética con `number`.
