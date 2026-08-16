# Wireframes — ERP Distribuidora Médica

**Versión:** 1.0  
**Tipo:** Low-Fidelity (ASCII / Text-based)  
**Total de pantallas:** 35  

---

## Convención de Wireframes

```
┌─────────────────────┐   Marco principal / contenedor
│                     │
└─────────────────────┘

[ Botón ]              Botón de acción
[ Botón primario ]     Botón de acción principal (CTA)
[ x ]                  Botón destructivo / cancelar

[___________________]  Campo de texto vacío
[_valor actual_____]   Campo de texto con valor

[v Opción selec.   ]   Dropdown cerrado
┌──────────────────┐
│ • Opción 1       │   Dropdown abierto
│   Opción 2       │
└──────────────────┘

[ x ] Label            Checkbox marcado
[   ] Label            Checkbox desmarcado
( • ) Opción           Radio button seleccionado
(   ) Opción           Radio button no seleccionado

⚠ Mensaje de alerta
✓ Confirmación / éxito
✗ Error / rechazo
ℹ Información

[████████░░] 80%       Barra de progreso

│ Col1 │ Col2 │ Col3 │  Encabezado de tabla
├──────┼──────┼──────┤
│ dat  │ dat  │ dat  │  Fila de tabla
```

---

## Índice de Pantallas

### 🏗️ Shell & Auth
| Archivo | Pantalla | Sprint |
|---------|----------|--------|
| [00_app_shell.md](./00_app_shell.md) | Layout / Sidebar / App Shell | S0 |
| [01_login.md](./01_login.md) | Login | S1 — US-01 |
| [02_dashboard.md](./02_dashboard.md) | Dashboard KPIs | S10 — US-35 |

### 📦 Catálogo
| Archivo | Pantalla | Sprint |
|---------|----------|--------|
| [03_products_list.md](./03_products_list.md) | Lista de Productos | S1 — US-05 |
| [04_product_form.md](./04_product_form.md) | Formulario de Producto | S1 — US-04 |

### 📊 Stock
| Archivo | Pantalla | Sprint |
|---------|----------|--------|
| [05_stock_overview.md](./05_stock_overview.md) | Vista General de Stock | S2 — US-06 |
| [06_stock_detail.md](./06_stock_detail.md) | Detalle de Stock / Ledger | S2 — US-06 |
| [07_quarantine.md](./07_quarantine.md) | Gestión de Cuarentena | S2 — US-10 |
| [08_bulk_load.md](./08_bulk_load.md) | Carga Masiva Inicial | S2 — US-09 |

### 🚚 Proveedores & Importador
| Archivo | Pantalla | Sprint |
|---------|----------|--------|
| [09_suppliers_list.md](./09_suppliers_list.md) | Lista de Proveedores | S3 — US-11 |
| [10_supplier_catalog.md](./10_supplier_catalog.md) | Catálogo SKUs Proveedor | S3 — US-12 |
| [11_importer_wizard.md](./11_importer_wizard.md) | Wizard de Importación Excel/CSV | S3 — US-13/14 |

### 🛒 Compras & Recepciones
| Archivo | Pantalla | Sprint |
|---------|----------|--------|
| [12_purchase_orders_list.md](./12_purchase_orders_list.md) | Lista de Órdenes de Compra | S4 — US-15 |
| [13_purchase_order_form.md](./13_purchase_order_form.md) | Formulario de OC | S4 — US-15 |
| [14_goods_receipt_form.md](./14_goods_receipt_form.md) | Formulario de Recepción | S4 — US-16 |
| [15_backorders.md](./15_backorders.md) | Panel de Backorders | S4 — US-17 |

### 📑 Facturas Proveedores & Costos
| Archivo | Pantalla | Sprint |
|---------|----------|--------|
| [16_supplier_invoices_list.md](./16_supplier_invoices_list.md) | Lista Facturas de Proveedor | S5 — US-18 |
| [17_supplier_invoice_detail.md](./17_supplier_invoice_detail.md) | Detalle de Factura Proveedor | S5 — US-18/19/20 |

### 💲 Precios
| Archivo | Pantalla | Sprint |
|---------|----------|--------|
| [18_price_review_tray.md](./18_price_review_tray.md) | Bandeja de Revisión de Precios | S6 — US-22 |
| [19_markup_config.md](./19_markup_config.md) | Configuración de Markups | S6 — US-21 |

### 👥 Clientes
| Archivo | Pantalla | Sprint |
|---------|----------|--------|
| [20_customers_list.md](./20_customers_list.md) | Lista de Clientes | S6 — US-23 |
| [21_customer_detail.md](./21_customer_detail.md) | Detalle de Cliente + CtaCte | S6/9 — US-24/29 |

### 🛍️ Ventas & ARCA
| Archivo | Pantalla | Sprint |
|---------|----------|--------|
| [22_pos.md](./22_pos.md) | Punto de Venta (POS) | S7 — US-25 |
| [23_sales_list.md](./23_sales_list.md) | Lista de Ventas | S7 — US-25 |
| [24_sale_detail.md](./24_sale_detail.md) | Detalle de Venta + Devoluciones | S7/8 — US-25/28 |
| [25_fiscal_alerts.md](./25_fiscal_alerts.md) | Alertas Fiscales ARCA | S8 — US-27 |

### 💳 Cobranzas & Cheques
| Archivo | Pantalla | Sprint |
|---------|----------|--------|
| [26_account_receivable.md](./26_account_receivable.md) | Cuenta Corriente de Cliente | S9 — US-29 |
| [27_payment_form.md](./27_payment_form.md) | Formulario de Cobro | S9 — US-30 |
| [28_receipt_view.md](./28_receipt_view.md) | Vista de Recibo | S9 — US-30 |
| [29_checks_list.md](./29_checks_list.md) | Lista de Cheques | S9 — US-31 |

### 🏦 Tesorería
| Archivo | Pantalla | Sprint |
|---------|----------|--------|
| [30_treasury_overview.md](./30_treasury_overview.md) | Vista General de Tesorería | S10 — US-34 |
| [31_cash_register.md](./31_cash_register.md) | Caja y Arqueo | S10 — US-33 |

### 📊 Reportes
| Archivo | Pantalla | Sprint |
|---------|----------|--------|
| [32_reports.md](./32_reports.md) | Módulo de Reportes | S10 — US-37/46 |

### ⚙️ Administración
| Archivo | Pantalla | Sprint |
|---------|----------|--------|
| [33_users_management.md](./33_users_management.md) | Gestión de Usuarios | S1 — US-02 |
| [34_system_config.md](./34_system_config.md) | Configuración del Sistema | S10 — US-46 |
