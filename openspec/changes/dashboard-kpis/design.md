# Design

## Decisions

1. **Un servicio, cinco consultas** de `COUNT`/`SUM` con `Promise.all`; sin caché (puesto único, consultas indexadas por fecha/estado).
2. **Reglas reutilizadas**: bajo mínimo igual que `StockService` (`COALESCE(stock,0) <= min_stock`, producto activo) y vencimiento de cheques igual que `ChecksService.list` (`CURRENT_DATE` a `+7 days`), para que tarjeta y pantalla destino coincidan.
3. **Fechas** como día argentino (`AT TIME ZONE 'America/Argentina/Buenos_Aires'`) como en tesorería y reportes.
4. **Solo ADMIN**: la US es del Administrador; el VENDEDOR no ve tarjetas en lugar de ceros falsos.

## Risks

- El destino de cheques no filtra por vencimiento 7d (la pantalla ya muestra el aviso de cheques por vencer).
