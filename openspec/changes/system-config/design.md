# Design

## Context

- `SystemConfigService` ya gestiona `purchase_settings` (fila única, tolerancia) con transacción, lock y `AuditService.record`. `SystemConfigModule` exporta el service.
- El emisor se lee con `ConfigService` en tres lugares (processor de PDF fiscal, `ReceiptsController`, `InvoiceTypeResolverService`). WSFE lee `ARCA_CUIT` y `ARCA_PUNTO_VENTA` de env.
- `isValidCuit` vive en `@erp/shared-types`; `IsValidCuit` es el decorador de class-validator (módulo suppliers).

## Goals / Non-Goals

**Goals**

- Un único lugar para resolver el valor efectivo, reutilizable por consumidores.
- Cambios auditados y validados en el trust boundary.

**Non-Goals**

- Que la emisión fiscal dependa de la base de datos; migrar tolerancia.

## Decisions

1. **Clave/valor `system_settings(key PK, value text, updated_by_user_id, updated_at)`** sin seed. Fila ausente = "no definido". Evita migrar datos reales y deja el fallback a env sin ambigüedad. Alternativa: fila única con columnas (como `purchase_settings`); descartada porque cada parámetro nuevo exigiría migración.
2. **`SystemConfigService.getEffective()`** devuelve el objeto completo; `getIssuer()` es un atajo para los PDFs. Los consumidores inyectan `SystemConfigService` en vez de `ConfigService` para estos tres valores.
3. **WSFE sigue en env** (decisión del owner técnico): un CUIT editable no puede desalinearse del certificado. La UI muestra un aviso en esos campos. El Go-Live decide si migra.
4. **Validación en DTO** (class-validator): `IsValidCuit`, `IsEnum(TaxCondition)`, `IsInt` 1–99999, `IsIn(['ARS','USD'])`, `Length` razón social. `@Type(() => Number)` para el punto de venta.
5. **Un `AuditLog` por campo cambiado** (`entityName: 'SystemSetting'`, `entityId: key`), mismo patrón que `PurchaseSettings`.

## Risks / Trade-offs

- Dos fuentes de verdad (DB y env) para CUIT y punto de venta hasta el Go-Live: mitigado con aviso en UI y fallback explícito en la spec.
- `InvoiceTypeResolverService` pasa a depender de la base de datos: una caída de DB ya detiene la venta, sin riesgo adicional.
