<Wireframe: Lista de Facturas de Proveedor>
**Módulo:** Compras  
**Ruta:** `/purchases/supplier-invoices`  
**Rol(es):** ADMINISTRADOR | VENDEDOR (solo ver)  
**Sprint:** Sprint 4 — US-16  

## Descripción
Pantalla principal para listar y gestionar facturas de proveedores. Permite conciliar facturas contra recepciones de mercadería y destacar aquellas que superan las tolerancias de costo (OBSERVADA).

## Estados

### Estado 1: Vista Principal con filtro y registros destacados

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                     [Admin] [ADMIN] [Cerrar ↩]  │
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Compras > Facturas de Proveedores                             │
│              │                                                                │
│ 📊 Dashboard │  [ + Registrar Factura ]                                       │
│ 📦 Productos │                                                                │
│ 📋 Stock     │  Filtros:                                                      │
│ 🚚 Compras   │  Proveedor: [v Todos          ]  Estado: [v Todos         ]    │
│ 💼 Ventas    │  [______________] 🔍 Buscar                                   │
│ 👥 Clientes  │                                                                │
│ 💰 CtaCte    │  ┌─────────────────────────────────────────────────────────┐   │
│ 🏦 Tesorería │  │ N° Factura │ Proveedor    │ Fecha │ N° Rec │ Diferencia%│   │
│ 📄 Reportes  │  ├────────────┼──────────────┼───────┼────────┼────────────┤   │
│ ⚙️ Config    │  │ FC-0012-44 │ MedTech BA   │ 10/08 │ RC-102 │      1.5%  │   │
│              │  │ Estado: [CONFIRMADA] Monto: $ 1.250.000       [ Detalles]│   │
│              │  ├────────────┼──────────────┼───────┼────────┼────────────┤   │
│              │  │ FC-0012-58 │ BioInsumos   │ 12/08 │ RC-105 │ ⚠   12.0%  │   │
│              │  │ Estado: [OBSERVADA ] Monto: $   350.000       [ Detalles]│   │
│              │  ├────────────┼──────────────┼───────┼────────┼────────────┤   │
│              │  │ FC-0013-02 │ Descartables │ 14/08 │ RC-106 │      0.0%  │   │
│              │  │ Estado: [VALIDANDO ] Monto: $   890.000       [ Detalles]│   │
│              │  └─────────────────────────────────────────────────────────┘   │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

## Notas de Interacción
- La factura en estado OBSERVADA (Diferencia > Tolerancia) se resalta en naranja.
- Acciones sobre OBSERVADA (Autorizar/Rechazar) se realizan dentro de "Detalles" o con un menú contextual.
- El botón [+ Registrar Factura] abre el flujo de conciliación (seleccionar recepción -> cargar factura).
