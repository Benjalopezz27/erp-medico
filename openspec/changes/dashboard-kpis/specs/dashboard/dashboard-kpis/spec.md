# Spec Delta

## Purpose

Mostrar al Administrador los indicadores clave del negocio al día.

## ADDED Requirements

### Requirement: KPIs ejecutivos

El sistema SHALL exponer `GET /dashboard/kpis`, solo para ADMINISTRADOR, con el total de ventas confirmadas del día y del mes en curso (día calendario argentino, importes como decimal exacto), la cantidad de productos activos con stock menor o igual al mínimo, la cantidad de facturas de proveedor `OBSERVADA` y la cantidad de cheques `RECIBIDO` o `EN_CARTERA` con vencimiento entre hoy y los próximos 7 días.

#### Scenario: Ventas del día y del mes

- **WHEN** hay ventas confirmadas hoy por $100.00 y otra anterior del mismo mes por $50.00, más una cancelada hoy
- **THEN** ventas del día es $100.00 y del mes es $150.00

#### Scenario: Sin permiso

- **WHEN** un VENDEDOR pide los KPIs
- **THEN** el sistema responde 403

### Requirement: Tarjetas navegables

El dashboard del Administrador SHALL mostrar una tarjeta por KPI y cada una MUST navegar al módulo correspondiente.

#### Scenario: Navegación

- **WHEN** el administrador pulsa la tarjeta de facturas observadas
- **THEN** va al listado de facturas de proveedor filtrado por `OBSERVADA`
