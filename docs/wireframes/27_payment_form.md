<Wireframe: Formulario de Cobro>
**Módulo:** CtaCte / Tesorería  
**Ruta:** `/payments/new`  
**Rol(es):** ADMINISTRADOR | VENDEDOR  
**Sprint:** Sprint 3 — US-10

## Descripción

Pantalla para registrar cobros y aplicarlos a facturas específicas de un cliente.

## Estados

### Estado 1: Formulario

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                     [J. Pérez] [VENDEDOR] [Cerrar ↩]  │
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Cuentas Corrientes > Registrar Cobro                          │
│              │                                                                │
│ 💰 CtaCte    │  Cliente: [v Farmacia del Sud          ]   Saldo: $ 450.000    │
│ 🏦 Tesorería │                                                                │
│              │  Facturas a Cancelar:                                          │
│              │  ( ) Aplicar por Antigüedad Automático  (•) Selección Manual   │
│              │  ┌───────────────────────────────────────────────────────────┐ │
│              │  │ [x] Factura N° | Fecha  | Monto    | Saldo    | A Aplicar │ │
│              │  ├───────────────────────────────────────────────────────────┤ │
│              │  │ [x] FC-000101  | 10/06  | $ 150.000| $ 150.000| [$ 150.000] │
│              │  │ [x] FC-000102  | 05/07  | $ 200.000| $ 200.000| [$ 100.000] │
│              │  │ [ ] FC-000105  | 10/08  | $ 100.000| $ 100.000| [$       0] │
│              │  └───────────────────────────────────────────────────────────┘ │
│              │  Total a Aplicar: $ 250.000                                    │
│              │                                                                │
│              │  Medios de Cobro:                                              │
│              │  Efectivo:      [$  50.000]                                    │
│              │  Transferencia: [$       0]                                    │
│              │  Cheque:        [$ 200.000]                                    │
│              │                                                                │
│              │  Detalle de Cheque(s):                                         │
│              │  Banco: [v Galicia   ] N°: [ 12345678 ] Librador: [ Juan Paz ] │
│              │  Monto: [$ 200.000   ] Fecha Vto: [ 15/09/2026 📅]             │
│              │                                                                │
│              │  ───────────────────────────────────────────────────────────── │
│              │  Total Cobrado: $ 250.000  |  Diferencia: $ 0   ✓              │
│              │                                                                │
│              │  [ REGISTRAR COBRO Y EMITIR RECIBO ]                           │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

## Notas de Interacción

- El "Total a Aplicar" debe coincidir exactamente con el "Total Cobrado" para poder registrar el cobro.
- Si se tilda "Aplicar por Antigüedad Automático", el sistema rellena los inputs de "A Aplicar" empezando por la factura más vieja hasta cubrir el monto cobrado ingresado.
