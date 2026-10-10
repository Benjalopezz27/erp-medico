# Migración de single-tenant a multi-tenant (foco: ARCA)

> Análisis exploratorio, sin compromiso de implementación. Fecha: 2026-10-09.
> Estado: la migración **no** está planificada; este documento deja registrado el camino posible.

## 1. Estado actual (single-tenant)

La integración con ARCA está atada al proceso: se configura por variables de entorno y se lee una sola vez.

- **`apps/backend/src/modules/arca/arca.provider.ts`:** crea un singleton `ARCA_SERVICE` al arrancar. El valor de `ARCA_ENV` decide si el cliente es disabled, mock u homologation.
- **`ArcaHomologationService`:** lee `ARCA_CUIT`, `ARCA_PUNTO_VENTA`, `ARCA_WSAA_URL` y `ARCA_WSFE_URL` en el constructor y las guarda en campos de la instancia. También guarda un `cachedTicket` en memoria.
- **`ArcaCertificateLoader`:** lee `ARCA_CERT_BASE64`, `ARCA_CERT_PATH` y `ARCA_CERT_PASSWORD`, y deja un único certificado en `cachedCertData`.
- **Otros consumidores de `ARCA_CUIT`:** `pdf-generate.processor.ts`, `fiscal-qr-payload.service.ts` y las variables `ARCA_EMISOR_*` del PDF. `ARCA_PUNTO_VENTA` también se lee en `fiscal-contingency-orchestrator.service.ts`.
- **`ARCA_SWEEP_*`:** son parámetros globales de operación, no de tenant. Se quedan como variables de entorno.

Hay dos piezas que ya ayudan:

- **`SystemSettingsService`** (`modules/config`): guarda `issuer_cuit` y `arca_punto_venta` en la tabla `system_settings`, con la variable de entorno como respaldo. Es el germen de la configuración por tenant.
- **`ArcaTicketCacheService`:** la clave de Redis ya es `arca:wsaa:ticket:{env}:{cuit}`. El cache de tickets WSAA ya separa por CUIT y no necesita cambios.

## 2. Qué tiene que cambiar

1. **Tabla `tenant_arca_config`:** una fila por tenant con:
   - `tenant_id`
   - `cuit`
   - `punto_venta`
   - `arca_env` (homologation o production)
   - `cert_encrypted` y `cert_password_encrypted`
   - datos del emisor: razón social, nombre comercial, IIBB, domicilio, inicio de actividades y condición de IVA

   Las URL de WSAA y WSFE se derivan de `arca_env`; no se guardan por tenant.
2. **Secretos en la base de datos:** el certificado `.p12` y su password pasan de variables selladas de Railway a la tabla.
   - Se cifran a nivel de aplicación con AES-256-GCM.
   - La clave maestra queda como una única variable de entorno, `ARCA_CONFIG_KEY`. Más adelante puede migrar a KMS o Vault.
   - Nunca se loguea ni se devuelve el certificado por la API.
3. **Cliente ARCA por tenant:**
   - `ARCA_SERVICE` pasa de singleton a una factory, por ejemplo `ArcaClientFactory.forTenant(tenantId)`.
   - La factory mantiene un `Map<tenantId, ArcaHomologationService>` en memoria y lo invalida cuando cambia la configuración o vence el certificado.
   - `ArcaCertificateLoader` deja de cachear un único certificado y cachea por tenant.
   - El `cachedTicket` en memoria queda por instancia, es decir por tenant. Redis ya separa por CUIT.
4. **Consumidores:** los puntos que hoy leen `ARCA_CUIT` y `ARCA_PUNTO_VENTA` piden el emisor al tenant actual.
   - Afecta al PDF, al QR, al orquestador de contingencia y al sweep de reconciliación.
   - El sweep itera por tenant.
   - Los jobs de BullMQ llevan `tenantId` en el payload.
5. **Aislamiento de datos:** `tenant_id` en todas las tablas de negocio, con Row Level Security en Postgres o un filtro obligatorio en TypeORM. Es el cambio más grande de la migración, y no es específico de ARCA.
6. **Numeración fiscal:** debe ser por tenant, punto de venta y tipo de comprobante. Hay que verificar si hoy es global.

## 3. Ruta de migración sin romper producción

1. Agregar `tenants` y la columna `tenant_id`, con un tenant "default" y backfill de todos los datos existentes.
2. Crear `tenant_arca_config` y cargar el tenant default desde las variables actuales. Mantener el respaldo por variables de entorno durante las pruebas.
3. Introducir la factory y cambiar los consumidores de a uno. Con un solo tenant el comportamiento no cambia.
4. Cuando todo lea de la base de datos, retirar `ARCA_CUIT`, `ARCA_PUNTO_VENTA`, `ARCA_CERT_*` y `ARCA_EMISOR_*`. Quedan solo `ARCA_CONFIG_KEY` y `ARCA_SWEEP_*`.
5. Agregar el onboarding por tenant: subir el certificado, probar el login WSAA y consultar `FEParamGetPtosVenta`.

## 4. Riesgos

- **Delegación de certificado:** cada cliente necesita su propio certificado, o hay que operar como representante. Es un tema legal y de ARCA, no de código.
- **Reloj y vencimiento:** `ArcaClockSyncService` y las alertas de vencimiento del certificado deben repetirse por tenant.
- **Límites de WSAA:** un login por tenant cada 12 horas. El volumen es bajo y el cache en Redis lo cubre.
- **`AGENTS.md` §2:** la regla de que ningún certificado entra al contexto de un modelo se mantiene, pero pasa a proteger datos de terceros.

## 5. Siguiente paso sugerido

Abrir changes de OpenSpec separados (`/opsx:propose`):

1. Aislamiento de datos por tenant (`tenant_id`, RLS, backfill).
2. Configuración de ARCA por tenant (tabla, cifrado, factory, onboarding).
3. Numeración fiscal por tenant.

Esta nota estima la forma del trabajo, no el esfuerzo.
