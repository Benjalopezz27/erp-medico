<Wireframe: Reportes>
**Módulo:** Reportes  
**Ruta:** `/reports`  
**Rol(es):** ADMINISTRADOR  
**Sprint:** Sprint 5 — US-15  

## Descripción
Centro de reportes del sistema. Presenta un layout común para todos los informes.

## Estados

### Estado 1: Layout Común (Ejemplo: Reporte de Ventas)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                        [Admin] [ADMIN] [Cerrar ↩]  │
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Reportes > Reporte de Ventas                                  │
│              │                                                                │
│ 📊 Dashboard │  Filtros:                                                      │
│ 📦 Productos │  [ 01/08/2026 - 14/08/2026 📅] [v Vendedor (Todos) ]           │
│ 📋 Stock     │  [ GENERAR REPORTE ]                                           │
│ 🚚 Compras   │                                                                │
│ 💼 Ventas    │  Resultados: (3 registros)        [ EXPORTAR EXCEL ] [ PDF ]   │
│ 👥 Clientes  │  ┌───────────────────────────────────────────────────────────┐ │
│ 💰 CtaCte    │  │ Fecha      | Cliente      | Vendedor | Medio  | Total     │ │
│ 🏦 Tesorería │  ├───────────────────────────────────────────────────────────┤ │
│ 📄 Reportes  │  │ 14/08/2026 | Farmacia Sur | J. Pérez | CtaCte | $ 24.805  │ │
│ ⚙️ Config    │  │ 13/08/2026 | Hosp. Norte  | J. Pérez | Mixto  | $ 150.000 │ │
│              │  │ 13/08/2026 | Clín. Oeste  | L. Gómez | Efect. | $ 12.000  │ │
│              │  ├───────────────────────────────────────────────────────────┤ │
│              │  │ TOTALES:                           |          | $ 186.805 │ │
│              │  └───────────────────────────────────────────────────────────┘ │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

### Resumen de Reportes Disponibles:

1. **Ventas:** Filtros (Fechas, Vendedor, Cliente). Columnas (Fecha, Cliente, Vend, Medio, Total).
2. **Productos Más Vendidos:** Filtros (Fechas). Columnas (Producto, Categoría, Cant. Vendida, Monto).
3. **Stock Crítico:** Filtros (Categoría). Columnas (Producto, Stock Actual, Pto. Reposición).
4. **Cuentas por Cobrar (Deudores):** Filtros (Antigüedad). Columnas (Cliente, Fact. Pendientes, Saldo, Días Atraso).
5. **Cuentas por Pagar (Proveedores):** Filtros (Fechas Vto). Columnas (Proveedor, Saldo, Vto Próximo).
6. **Ingresos y Egresos (Caja):** Filtros (Fechas, Cuenta). Columnas (Fecha, Concepto, Ingreso, Egreso, Saldo).
7. **Impuestos (IVA Ventas/Compras):** Filtros (Mes/Año). Columnas (Fecha, Comprobante, CUIT, Neto, IVA, Total).
8. **Devoluciones:** Filtros (Fechas). Columnas (Fecha, Producto, Cantidad, Motivo, Estado Stock).
9. **Rentabilidad (Costo vs Precio):** Filtros (Fechas). Columnas (Producto, Costo Promedio, P. Venta, Margen %).

## Notas de Interacción
- El panel de filtros se adapta dependiendo del reporte seleccionado.
- La exportación a Excel y PDF toma exactamente las columnas mostradas en pantalla.
