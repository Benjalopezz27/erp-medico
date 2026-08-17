</Agent System Instructions>
<Wireframe: Recepción de Mercadería>
**Módulo:** Compras  
**Ruta:** `/purchases/orders/:id/receive`  
**Rol(es):** ADMINISTRADOR  
**Sprint:** Sprint 2 — US-14

## Descripción

Interfaz para registrar el ingreso al stock (Recepción) contra una Orden de Compra, documentado mediante un Remito de proveedor.

## Estados

### Estado 1: Formulario de Recepción

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                     [J. Perez] [ADMIN] [Cerrar ↩]│
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Inicio > Compras > OC-00141 > Recibir                        │
│              │                                                               │
│ 📊 Dashboard │  REGISTRAR RECEPCIÓN PARA OC-00141     Estado: [ EMITIDA ]    │
│ 📦 Productos │  Proveedor: 3M Argentina       Fecha Emisión: 09/10/24        │
│ 📋 Stock     │                                                               │
│ 🚚 Compras   │  DATOS DEL REMITO                                             │
│ 💼 Ventas    │  N° Remito Prov: [ 0001-00054321 ]                            │
│ 👥 Clientes  │                                                               │
│ 💰 CtaCte    │  ÍTEMS A INGRESAR                                             │
│ 🏦 Tesorería │  ┌─────────────────────────────────────────────────────────┐  │
│ 📄 Reportes  │  │ Producto    │ Ped │ Ya Rec │ A Recibir │ Costo N. │ Un.B│  │
│ ⚙️ Config    │  ├─────────────┼─────┼────────┼───────────┼──────────┼─────┤  │
│              │  │ Cinta Micro │ 10  │ 0      │ [ 10    ] │ [$15000] │ 120 │  │
│              │  │ Masc. N95   │ 50  │ 20     │ [ 30    ] │ [$35000] │ 600 │  │
│              │  └─────────────────────────────────────────────────────────┘  │
│              │                                                               │
│              │  ⚠ Aviso: Se recibirán unidades parciales. La OC quedará en   │
│              │    estado PARCIAL. (Si "A Recibir" < Ped - Ya Rec).           │
│              │                                                               │
│              │                              [ Registrar Recepción ]          │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

## Notas de Interacción

- "Ya Rec" muestra cantidades ingresadas en remitos anteriores.
- Si "A Recibir" es mayor que lo pendiente (Ped - Ya Rec), mostrar error o warning en línea y permitir forzar ingreso excedente solo con confirmación.
- "Un. B" (Unidades Base Equiv) = A Recibir * Factor de Conversión de la Unidad de Compra. Es _read-only_ y muestra cuánto impactará en el stock real.
- "Costo N." (Costo Neto) define el costo de la mercadería que ingresa.
