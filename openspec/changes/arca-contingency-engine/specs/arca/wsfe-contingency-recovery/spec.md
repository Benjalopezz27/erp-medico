# Spec Delta

## Purpose

Recuperar de forma idempotente las emisiones fiscales (`wsfe-emit`) interrumpidas antes o después
de obtener el CAE, para que una falla de red o de proceso nunca revierta la venta ni produzca un
segundo comprobante fiscal para el mismo documento lógico.

## ADDED Requirements

### Requirement: Política de reintentos automáticos con backoff exponencial

El sistema SHALL configurar la cola `wsfe-emit` con hasta 5 reintentos automáticos y backoff
exponencial de base 30 segundos (30, 60, 120, 240 y 480 segundos según el conteo efectivo de
intentos fallidos de BullMQ), y SHALL agotar esos reintentos únicamente para fallas clasificadas
como transitorias.

#### Scenario: Falla transitoria antes del cuarto intento

- **WHEN** el mock de ARCA falla con un error transitorio tres veces consecutivas
- **THEN** el sistema reintenta con los delays configurados y obtiene el CAE en el cuarto intento

#### Scenario: Cinco fallas transitorias consecutivas

- **WHEN** las 5 reintentos automáticos fallan por causas transitorias
- **THEN** el documento queda `RECHAZADO` con metadata de intentos y último error sanitizado, sin
  más reintentos automáticos

### Requirement: Clasificación de fallas transitorias vs rechazo fiscal definitivo

El sistema SHALL distinguir una falla transitoria (red, timeout, error 5xx, WSFE no disponible) de
un rechazo fiscal definitivo (ARCA responde `Resultado` distinto de aprobado) o de un error de
validación de datos (p. ej. totales inconsistentes), y SHALL marcar `RECHAZADO` inmediatamente ante
un rechazo definitivo o de validación, sin consumir reintentos adicionales.

#### Scenario: Rechazo fiscal definitivo en el primer intento

- **WHEN** ARCA responde que el comprobante fue rechazado (no autorizado)
- **THEN** el sistema marca el documento `RECHAZADO` en el primer intento, sin programar reintentos
  automáticos adicionales

#### Scenario: Timeout de red no se trata como rechazo definitivo

- **WHEN** la solicitud a WSFE falla por timeout de red
- **THEN** el sistema mantiene el documento en `PENDIENTE_FACTURACION` y programa un reintento
  automático según la política de backoff

### Requirement: Escenario A — fallo transitorio previo a la obtención del CAE

Ante una falla transitoria antes de que ARCA confirme la autorización del comprobante, el sistema
SHALL mantener el `FiscalDocument` en `PENDIENTE_FACTURACION`, SHALL mantener la venta o devolución
asociada en su estado confirmado sin revertir stock, cuenta corriente ni auditoría comercial, y
SHALL reprogramar el reintento según la política de backoff.

#### Scenario: Timeout antes de solicitar el CAE

- **WHEN** ocurre un timeout de red al invocar `FECAESolicitar` por primera vez para un documento
- **THEN** la venta permanece `CONFIRMADA`, el stock y la cuenta corriente no se modifican, y el
  documento fiscal se reintenta automáticamente

### Requirement: Escenario B — reconciliación ante identidad fiscal ya asignada

Ante cualquier reintento de un documento que ya tiene punto de venta y número reservados, el
sistema SHALL consultar primero a ARCA (`FECompConsultar`) por ese comprobante antes de invocar de
nuevo `FECAESolicitar`. Si la consulta confirma que ARCA ya autorizó el comprobante, el sistema
SHALL persistir ese CAE existente sin solicitar uno nuevo. Si la consulta confirma que el
comprobante no existe todavía, el sistema SHALL continuar con la emisión normal. Si la consulta
resulta incierta (falla la consulta misma), el sistema SHALL NOT invocar `FECAESolicitar` en ese
intento.

#### Scenario: Corte de red después de que ARCA ya autorizó

- **WHEN** un reintento consulta un comprobante con número ya reservado y ARCA confirma que ya fue
  autorizado con un CAE
- **THEN** el sistema persiste ese CAE existente, marca el documento `EMITIDO` y no invoca
  `FECAESolicitar` de nuevo

#### Scenario: Consulta confirma que el comprobante no existe

- **WHEN** un reintento consulta un comprobante con número ya reservado y ARCA responde que no
  existe
- **THEN** el sistema invoca `FECAESolicitar` una única vez para ese intento

#### Scenario: Consulta incierta no dispara una emisión a ciegas

- **WHEN** la consulta a ARCA sobre un comprobante con número ya reservado falla por un problema de
  red o fault
- **THEN** el sistema NO invoca `FECAESolicitar` en ese intento y programa un nuevo reintento según
  la política de backoff

### Requirement: Metadata de diagnóstico por documento

El sistema SHALL persistir por `FiscalDocument`: cantidad de intentos realizados, timestamp del
último intento, timestamp del próximo intento programado, etapa en la que falló el último intento
(previa o posterior a la obtención del CAE) y un código de error interno estable junto con un
mensaje sanitizado, sin exponer el payload SOAP completo ni secretos.

#### Scenario: Consulta de diagnóstico tras varios reintentos

- **WHEN** un documento acumuló 3 intentos fallidos transitorios
- **THEN** el sistema expone `attemptCount=3`, el timestamp del último y próximo intento, la etapa
  de la última falla y un mensaje de error sanitizado

### Requirement: Documento ya emitido es no-op idempotente

El sistema SHALL tratar el reprocesamiento de un job para un `FiscalDocument` que ya está `EMITIDO`
como un éxito idempotente sin efecto, y SHALL NOT reemplazar un CAE ya persistido por otro valor
bajo ninguna circunstancia.

#### Scenario: Reprocesar un job de un documento ya emitido

- **WHEN** el mismo job de emisión se procesa de nuevo para un documento que ya tiene CAE
  persistido
- **THEN** el sistema no contacta a ARCA, no modifica el CAE existente y reporta la operación como
  exitosa

### Requirement: Convergencia entre retry automático, manual y recuperación

El sistema SHALL asegurar que el reintento automático, el reintento manual administrativo y el
barrido de recuperación nunca procesen concurrentemente el mismo `FiscalDocument`, y SHALL
converger todos al mismo resultado final (un único CAE o un único rechazo).

#### Scenario: Retry automático y manual simultáneos

- **WHEN** un reintento automático está en curso para un documento y un Administrador dispara el
  reintento manual del mismo documento al mismo tiempo
- **THEN** el sistema procesa un único intento efectivo contra ARCA para ese documento en ese
  momento, y ambos caminos observan el mismo resultado final sin duplicar número ni CAE

### Requirement: Recuperación de documentos pendientes sin job activo

El sistema SHALL identificar periódicamente y al iniciar el proceso worker los `FiscalDocument` en
`PENDIENTE_FACTURACION` que no tienen un job BullMQ activo asociado (por fallo de encolado
post-commit o por reinicio del worker), y SHALL re-encolarlos usando el mismo `jobId` determinista,
en lotes acotados por antigüedad y tamaño, ignorando documentos ya `EMITIDO` o con job activo.

#### Scenario: Documento huérfano por falla de encolado

- **WHEN** una venta se confirmó pero el encolado del job `wsfe-emit` falló porque Redis no estaba
  disponible en ese momento
- **THEN** el barrido de recuperación detecta el documento `PENDIENTE_FACTURACION` sin job activo y
  lo re-encola

#### Scenario: Reinicio del worker con jobs en curso

- **WHEN** el proceso worker se reinicia mientras existen documentos `PENDIENTE_FACTURACION` con
  jobs ya completados/perdidos en Redis
- **THEN** al arrancar, el barrido de recuperación re-encola esos documentos sin exceder el tamaño
  de lote configurado

### Requirement: Facturas y Notas de Crédito recorren la misma política

El sistema SHALL aplicar exactamente la misma política de reintentos, clasificación de errores y
reconciliación a Facturas A/B y a Notas de Crédito A/B.

#### Scenario: Nota de Crédito con falla transitoria

- **WHEN** la emisión de una Nota de Crédito A falla transitoriamente antes del CAE
- **THEN** el sistema aplica la misma reprogramación de reintento que a una Factura, sin
  desvincularla de la devolución/factura original
