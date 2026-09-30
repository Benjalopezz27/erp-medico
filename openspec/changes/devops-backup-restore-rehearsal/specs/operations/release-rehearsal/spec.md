# Spec Delta

## Purpose
Define el ensayo de release (deploy con migración, smoke y rollback) y su evidencia previa al Go-Live.

## ADDED Requirements

### Requirement: Ensayo local de deploy y rollback
El sistema SHALL poder ensayar, con imágenes de dos commits y datos sintéticos, un deploy con migración, un smoke y un rollback de imagen.

#### Scenario: Rollback tras migración compatible
- **WHEN** se despliega la imagen B con una migración nueva y se vuelve a la imagen A
- **THEN** la imagen A sirve `health/ready` y las funciones básicas sobre el esquema migrado

#### Scenario: Migración fallida
- **WHEN** la migración de B falla
- **THEN** B no arranca y A continúa sirviendo

### Requirement: Evidencia documentada
El ensayo SHALL dejar evidencia versionada (SHA, tiempos, resultado, observaciones) sin secretos ni datos reales.

#### Scenario: Evidencia completa
- **WHEN** se cierra un ensayo
- **THEN** existe un archivo de evidencia con SHA de ambas imágenes, tiempos de cada paso y resultado del rollback

### Requirement: Registro de gates y checklist
El sistema SHALL mantener un registro de gates externos con estado y una checklist de capacidad, seguridad y contingencia.

#### Scenario: Gate pendiente
- **WHEN** un gate no está aprobado
- **THEN** el registro lo marca pendiente y el runbook prohíbe activar backups contra datos reales
