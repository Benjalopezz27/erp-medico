# Tasks

## 1. Núcleo compartido

- [x] 1.1 Escribir `src/lib/money.spec.ts` (formato, vacío/`—`, negativo, `signed`, 4 decimales, round-trip `"1.500.000,5"` ↔ `"1500000.5"`, tope, decimales, negativos, pegado) y verificar que falla
- [x] 1.2 Implementar `src/lib/money.ts` con `Decimal` (`formatCurrency`, `formatMoneyInput`, `parseMoneyInput`) y verificar que `pnpm --filter frontend test money` pasa
- [x] 1.3 Escribir `money-input.spec.tsx` (miles al tipear, decimal, pegado, edición en medio con cursor, negativo, tope, ayuda `1,5 M`, valor crudo en `onValueChange`) y verificar que falla
- [x] 1.4 Implementar `components/ui/money-input.tsx` sobre `Input` y verificar que su spec pasa

## 2. Vistas: un solo `formatCurrency`

- [x] 2.1 Reemplazar usos de `formatCurrency` (products, purchase-orders) y borrar sus definiciones; verificar con tests de esos features y typecheck
- [x] 2.2 Reemplazar `formatMoneyAr`/`formatSignedMoneyAr` (supplier-invoices) y `formatPriceReviewMoney` (price-reviews); verificar tests y typecheck
- [x] 2.3 Reemplazar `toLocaleString`/`Intl.NumberFormat` de montos (importer `usualCostNet`, reports, dashboard, sales, cash-register, treasury, receivables, checks, payments); verificar con tests de cada feature

## 3. Inputs: migrar a `MoneyInput` por feature

- [x] 3.1 products (ProductForm), supplier-products (SupplierProductFormModal), importer (ResolveUnknownDrawer, EditAssociationDrawer); costos con `decimals=4`; verificar tests de forms
- [x] 3.2 cash-register (OpenCashForm, CloseCashForm) y treasury (NewMovementModal); verificar tests
- [x] 3.3 payments (PaymentFormPage), supplier-invoices (SupplierInvoiceForm), purchase-orders (GoodsReceiptLinesTable si es monto); verificar tests
- [x] 3.4 customers (CustomerFormModal si es monto), customer-pricing, prices (MarkupFormModal solo si es monto), price-reviews (PriceReviewDecisionModal); verificar tests
- [x] 3.5 Confirmar que cantidad/stock/porcentaje/factor (StockAdjustmentModal, QuarantineCreateModal, ProductConversionsGrid, SaleReturnItemRow, PosCart cantidad) siguen sin `MoneyInput`

## 4. Cierre

- [x] 4.1 `grep -rE "toLocaleString|Intl.NumberFormat" apps/frontend/src` no muestra formato de montos suelto (solo cantidades/fechas)
- [x] 4.2 Correr `pnpm run format:check && pnpm -r run lint && pnpm test && pnpm build` en limpio
- [ ] 4.3 Smoke test en navegador: tipear `1500000` en ProductForm y CloseCashForm, ver `1.500.000` + ayuda `1,5 M`, guardar y ver `$ 1.500.000,00` en la vista
