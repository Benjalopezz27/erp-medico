<Wireframe: Vista de Recibo>
**Módulo:** CtaCte  
**Ruta:** `/receipts/:id`  
**Rol(es):** ADMINISTRADOR | VENDEDOR  
**Sprint:** Sprint 3 — US-11

## Descripción

Vista del recibo generado, lista para imprimir o guardar en PDF.

## Estados

### Estado 1: Vista Previa de Impresión

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                     [J. Pérez] [VENDEDOR] [Cerrar ↩]  │
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Cuentas Corrientes > Recibo N° 0001-0000050                   │
│              │                                                                │
│ 💰 CtaCte    │  [ IMPRIMIR ] [ EXPORTAR PDF ]                                 │
│              │                                                                │
│              │  ┌─────────────────────────────────────────────────────────┐   │
│              │  │ DISTRIBUIDORA MÉDICA S.A.               RECIBO X        │   │
│              │  │ CUIT: 30-12345678-9                                     │   │
│              │  │ Fecha: 14/08/2026                       N° 0001-0000050 │   │
│              │  │ ─────────────────────────────────────────────────────── │   │
│              │  │ RECIBIMOS DE: Farmacia del Sud                          │   │
│              │  │ CUIT: 20-98765432-1                                     │   │
│              │  │ Domicilio: Av. San Martín 1234                          │   │
│              │  │ ─────────────────────────────────────────────────────── │   │
│              │  │ COMPROBANTES APLICADOS:                                 │   │
│              │  │ N° Factura | Fecha      | Monto Orig. | Aplicado        │   │
│              │  │ FC-000101  | 10/06/2026 | $ 150.000   | $ 150.000       │   │
│              │  │ FC-000102  | 05/07/2026 | $ 200.000   | $ 100.000       │   │
│              │  │ ─────────────────────────────────────────────────────── │   │
│              │  │ MEDIOS DE PAGO:                                         │   │
│              │  │ Efectivo: $ 50.000                                      │   │
│              │  │ Cheque: $ 200.000 (Banco Galicia, N° 12345678)          │   │
│              │  │ ─────────────────────────────────────────────────────── │   │
│              │  │ TOTAL COBRADO: $ 250.000                                │   │
│              │  │ Son pesos: Doscientos cincuenta mil con 00/100          │   │
│              │  │                                                         │   │
│              │  │                                                         │   │
│              │  │                          __________________________     │   │
│              │  │                                    Firma                │   │
│              │  └─────────────────────────────────────────────────────────┘   │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

## Notas de Interacción

- Formato adaptado para hoja A4 estándar.
