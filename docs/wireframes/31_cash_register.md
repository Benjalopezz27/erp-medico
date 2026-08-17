<Wireframe: Arqueo de Caja>
**Módulo:** Tesorería  
**Ruta:** `/treasury/cash-register`  
**Rol(es):** ADMINISTRADOR  
**Sprint:** Sprint 4 — US-14

## Descripción

Control de la caja registradora o caja chica, permitiendo apertura, registro de movimientos y cierre/arqueo.

## Estados

### Estado 1: Caja Cerrada

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                        [Admin] [ADMIN] [Cerrar ↩]  │
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Tesorería > Caja Diaria                                       │
│              │                                                                │
│ 🏦 Tesorería │  La caja se encuentra CERRADA.                                 │
│              │                                                                │
│              │  Último Cierre: 13/08/2026 18:30 (Saldo: $ 1.200.000)          │
│              │                                                                │
│              │  ┌───────────────────────────────────────────────┐             │
│              │  │ Apertura de Caja                              │             │
│              │  │ Saldo Inicial (Efectivo): [ $ 1.200.000 ]     │             │
│              │  │ [ ABRIR CAJA ]                                │             │
│              │  └───────────────────────────────────────────────┘             │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

### Estado 2: Caja Abierta y Arqueo

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                        [Admin] [ADMIN] [Cerrar ↩]  │
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Tesorería > Caja Diaria                                       │
│              │                                                                │
│ 🏦 Tesorería │  CAJA ABIERTA - Sesión iniciada: 14/08/2026 08:00              │
│              │  Saldo Inicial: $ 1.200.000 | Saldo Esperado: $ 1.250.000      │
│              │                                                                │
│              │  Movimientos del turno:                                        │
│              │  - 09:30 | Entrada | $ 60.000 | Venta Mostrador                │
│              │  - 11:00 | Salida  | $ 10.000 | Viáticos                       │
│              │  [ REGISTRAR MOVIMIENTO ]                                      │
│              │                                                                │
│              │  ┌───────────────────────────────────────────────┐             │
│              │  │ Arqueo de Caja                                │             │
│              │  │ Saldo Esperado:        $ 1.250.000            │             │
│              │  │ Saldo Contado Físico:  [ $ 1.250.000 ]        │             │
│              │  │ Diferencia:            $ 0                    │             │
│              │  │ [ CERRAR Y REGISTRAR ARQUEO ]                 │             │
│              │  └───────────────────────────────────────────────┘             │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

## Notas de Interacción

- La diferencia durante el arqueo se calcula automáticamente: Saldo Físico - Saldo Esperado.
- Si hay diferencia, se debe obligar a ingresar una observación al cerrar.
