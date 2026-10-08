# QA — regresión e2e, casos borde y volumen (#264)

## Qué cubre

| Suite                                  | Comando                                      | Qué prueba                                                                                                                                                                                                                                                                                                      |
| -------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `test/full-flow.e2e-spec.ts`           | `pnpm --filter @erp/backend run test:e2e`    | Cliente → venta → stock → Factura con CAE (`ArcaMockService`) → NC → stock repuesto → cobro y recibo; stock cero; tipo de comprobante por condición IVA/documento; importes con decimales (IVA 10,5 %); timeout a mitad de emisión sin duplicar comprobante; doble submit de emisión y doble job → un solo CAE. |
| `test/endpoint-timings.volume-spec.ts` | `pnpm --filter @erp/backend run test:volume` | Siembra volumen y mide endpoints críticos (mediana de 5). Separado de `test:e2e` para no alargarlo.                                                                                                                                                                                                             |

## Seed de volumen

`pnpm --filter @erp/backend run seed:volume` (`src/database/seeds/volume.seed.ts`). Determinista, sin
datos reales, idempotente: 5 000 productos con stock, 2 000 clientes, 5 000 ventas con ítem y
Factura B emitida (punto de venta 99, no choca con la numeración de los e2e). Tamaños ajustables con
`VOLUME_PRODUCTS`, `VOLUME_CUSTOMERS`, `VOLUME_SALES`. Se niega a correr con `NODE_ENV=production`.
Prefijos `VOL-P-`, `VOL-V-` y CUIT `308000000xx` identifican lo sembrado.

⚠️ Los e2e (`test:e2e`, `test:volume`) hacen `TRUNCATE` sobre la base apuntada por `DB_*`: usar una
base de test, nunca una con datos que importen.

## Umbrales (techos de regresión, mediana de 5 corridas, 5 000 productos / 2 000 clientes / 5 000 ventas)

| Endpoint                                                               | Umbral   | Medido en local |
| ---------------------------------------------------------------------- | -------- | --------------- |
| `GET /products` (página de 100)                                        | 500 ms   | ~85 ms          |
| `GET /products?search=`                                                | 500 ms   | ~10 ms          |
| `GET /products/search` (typeahead POS)                                 | 300 ms   | ~10 ms          |
| `GET /customers`                                                       | 500 ms   | ~5 ms           |
| `GET /sales` (página de 50)                                            | 500 ms   | ~115 ms         |
| `POST /sales` (POS, 1 ítem)                                            | 500 ms   | ~45 ms          |
| `GET /reports/{sales,stock-valuation,profitability,receivables-aging}` | 3 000 ms | 10–150 ms       |

En un runner más lento: `THRESHOLD_FACTOR=2 pnpm --filter @erp/backend run test:volume`.

## Smoke de UI en producción (manual, pendiente de ejecutar por el equipo)

Navegador y resolución del equipo del cliente. Datos de prueba (no CUIT/clientes reales).

1. Login → POS: buscar producto, agregar, confirmar venta con "Requiere factura".
2. Detalle de venta → comprobante pasa a `EMITIDO` con CAE.
3. Descargar PDF: se ve el QR y es legible/escaneable.
4. Devolución APTO → NC emitida → stock repuesto en la ficha del producto.

## Brechas halladas (ver `docs/DEBT.md` D-11)

Sin lote/vencimiento en el dominio; `POST /sales` sin idempotency key; reporte de ventas excluye
ventas de mostrador sin cliente.
