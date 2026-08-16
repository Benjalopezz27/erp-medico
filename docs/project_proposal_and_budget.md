# Propuesta Formal y Presupuesto Comercial — Sistema ERP Distribuidora Médica

**Documento:** Propuesta Técnico-Comercial de Desarrollo de Software  
**Cliente:** Distribuidora Médica  
**Proyecto:** Sistema de Gestión Comercial, Control de Stock, Facturación ARCA y Cuentas Corrientes (ERP MVP)  
**Modalidad de Desarrollo:** Desarrollador Senior Full-Stack Dedicado (Single Developer Model)  
**Versión:** 1.0 Final  
**Fecha:** Agosto 2026

---

## 1. Resumen Ejecutivo

El presente documento constituye la **Propuesta Formal y Comercial** para el diseño, desarrollo, pruebas e implementación del **Sistema de Gestión Comercial e Inventario para Distribuidora Médica**.

### Problema Operativo Actual a Resolver:
Actualmente, el negocio administra sus productos de forma desarticulada, gestionando el stock manualmente y realizando la facturación de manera independiente ingresando a la web de ARCA (AFIP). Esto genera duplicación de trabajo, riesgo de stock negativo y falta de trazabilidad financiera.

### Solución Propuesta:
Desarrollar un **ERP liviano especializado**, centralizado y en la nube, que unifique en una sola transacción operativa:
$$\text{Venta} \longrightarrow \text{Descuento de Stock en Tiempo Real} \longrightarrow \text{Facturación Electrónica ARCA} \longrightarrow \text{Cuenta Corriente / Cobro}$$

---

## 2. Alcance Funcional del MVP (Fase 1)

El sistema abarcará la totalidad de las necesidades operativas del negocio, organizadas en los siguientes módulos centrales:

| Módulo | Descripción del Alcance |
| --- | --- |
| **1. Autenticación y Permisos** | Control de acceso seguro (JWT/HTTPS) con **2 Roles Exclusivos**: `VENDEDOR` (operación diaria) y `ADMINISTRADOR` (control total y autorizaciones). Auditoría inmutable de acciones sensibles. |
| **2. Catálogo de Productos y Unidades** | Administración de 300-350 productos, categorías, unidades base (Unidad) y presentaciones (Caja, Caja Master, Bulto) con conversión automática. |
| **3. Inventario & Stock Ledger** | Motor de stock inmutable transaccional. **Prohibición estricta de stock negativo en backend**, alertas de stock bajo y carga inicial masiva vía Excel. |
| **4. Proveedores y Catálogos** | Registro de proveedores (con acceso directo a WhatsApp/Email) y diccionario de equivalencias SKU Producto Interno $\leftrightarrow$ SKU Proveedor. |
| **5. Importador Configurable** | Mapeo flexible de archivos Excel/CSV de proveedores con guardado de plantillas, previsualización, validación y resolución asistida de códigos desconocidos. |
| **6. Compras y Recepciones** | Gestión de Órdenes de Compra, recepciones parciales, conversión automática a unidades base y control de pendientes (*Backorders*). |
| **7. Costos, Tolerancias y Ajustes** | Cálculo de costo neto real. Detección de variaciones de costo; si excede la tolerancia configurada (ej. 5%), la factura queda `OBSERVADA` requiriendo aprobación. Algoritmo de ajuste retroactivo de costos para inventario y costo de ventas (COGS). |
| **8. Precios y Bandeja de Revisión** | Cálculo automatizado de precio sugerido según markup. **Regla de oro: Ningún precio al cliente cambia automáticamente**, requiere revisión y confirmación del Administrador. |
| **9. Clientes y Condiciones** | Gestión de clientes, límites de crédito, descuentos y precios especiales personalizados. |
| **10. Ventas & Punto de Venta (POS)** | Punto de venta ágil para ventas Contado y Crédito (Crédito siempre facturado; Contado permite opción sin factura fiscal con descuento de stock). |
| **11. Integración ARCA (AFIP)** | Emisión de Facturas A/B, Notas de Crédito/Débito A/B y Remitos desde el sistema con obtención de CAE y renderizado PDF/QR oficial. Manejo avanzado de contingencias sin duplicar comprobantes. |
| **12. Cuenta Corriente y Cobranzas** | Registro de cuenta corriente por movimientos transaccionales, aplicación de pagos (dirigida o en cascada por antigüedad) y emisión obligatoria de recibos. |
| **13. Gestión de Cheques** | Ciclo de vida completo de cheques (`RECIBIDO` $\rightarrow$ `EN CARTERA` $\rightarrow$ `DEPOSITADO` / `ENDOSADO` / `RECHAZADO`). Reversión atómica transaccional por cheque rechazado que restablece la deuda del cliente. |
| **14. Tesorería y Caja** | Desglose en `Efectivo`, `Bancos/Transferencias` y `Cheques en Cartera`. Control de ingresos, egresos y registro inmutable de diferencias de arqueo. |
| **15. Reportes Operativos** | Módulo de reportes exportables a Excel/PDF de Ventas, Stock, Compras, Rentabilidad, Cuentas Corrientes y Proveedores. |
| **16. Configuración General** | Parámetros comerciales, fiscales, datos de empresa, markups y tolerancias. |

---

## 3. Delimitación del Alcance (Fuera del MVP / Fase 2)

Para garantizar la entrega en tiempo y forma por parte del desarrollador dedicado, quedan explícitamente **fuera de esta propuesta inicial**:
* Aplicación móvil nativa o soporte offline/sin Internet.
* Manejo de múltiples sucursales o múltiples depósitos independientes.
* Trazabilidad por número de lote o fecha de vencimiento.
* Integraciones bancarias directas o con pasarelas de pago (Mercado Pago).
* Automatización de envíos directos de email/WhatsApp sin intervención humana.
* Portales externos autoservicio para clientes o proveedores.

---

## 4. Cronograma y Plan de Entregas (Roadmap de 2.5 Meses)

El desarrollo se ejecutará en **10 Sprints de 1 semana** (o 5 Sprints quincenales), garantizando entregas funcionales progresivas y testeables:

```text
[Sprint 1-2] ──► Fundación, Usuarios, Catálogo & Motor de Stock Ledger
[Sprint 3-4] ──► Proveedores, Importador Configurable & Módulo de Compras
[Sprint 5-6] ──► Costos, Tolerancias, Ajuste Retroactivo & Bandeja de Precios
[Sprint 7-8] ──► Ventas (POS), Integración ARCA (AFIP) & Devoluciones
[Sprint 9-10]──► Cuentas Corrientes, Cheques, Tesorería/Caja, Reportes & Puesta en Marcha
```

* **Duración Total Estimada:** 10 Semanas ($\approx$ 52 Días / Hombre de trabajo efectivo).
* **Demostraciones:** Al finalizar cada hito clave se realizará una sesión de avance con el cliente.

---

## 5. Estimación de Esfuerzo Técnico

El esfuerzo de ingeniería se distribuye de la siguiente manera:

| Hito / Componente Técnico | Días / Hombre | Porcentaje |
| --- | --- | --- |
| **1. Arquitectura, Base de Datos, Auth & Permisos** | 4.5 Días | 8.6% |
| **2. Catálogo, Conversiones & Motor de Stock Ledger** | 7.5 Días | 14.4% |
| **3. Proveedores & Importador Flexible de Archivos** | 8.0 Días | 15.3% |
| **4. Compras, Recepciones Parciales & Backorders** | 6.0 Días | 11.5% |
| **5. Costos, Tolerancias & Ajuste Retroactivo de Costos** | 7.0 Días | 13.4% |
| **6. Precios, Clientes & Condiciones Comerciales** | 5.5 Días | 10.5% |
| **7. Punto de Venta (POS) & Motor de Facturación ARCA** | 11.0 Días | 21.1% |
| **8. Cuentas Corrientes, Cobranzas & Gestión de Cheques** | 8.5 Días | 16.3% |
| **9. Tesorería, Caja, Suite de Reportes & Despliegue** | 6.0 Días | 11.5% |
| **TOTAL ESFUERZO TÉCNICO** | **~52 Días** | **100%** |

---

## 6. Propuesta Económica y Modalidad de Pago

### 6.1 Modalidad de Trabajo
Desarrollo por **Proyecto Cerrado con Alcance Congelado (MVP)**, ejecutado por un Desarrollador Senior Full-Stack exclusivo.

### 6.2 Esquema de Pagos por Hitos
Se propone un esquema de pagos dividido en **4 hitos vinculados a entregables verificables**:

1. **Anticipo Inicial (25%):** Firma de contrato, congelamiento de alcance e inicio de Sprint 1.
2. **Segundo Hito (25%):** Entrega probada de Catálogo, Motor de Stock, Proveedores, Compras e Importador.
3. **Tercer Hito (25%):** Entrega probada de Ventas, Punto de Venta e Integración ARCA (Facturación AFIP activa).
4. **Hito Final (25%):** Entrega de Cuentas Corrientes, Cheques, Tesorería, Reportes, Capacitación y Puesta en Marcha en Producción.

---

## 7. Costos de Infraestructura y Servicios de Terceros

Los siguientes costos de infraestructura son **a cargo del cliente** y no están incluidos en el honorario de desarrollo:
* **Hosting / Servidor Nube:** (ej. Hetzner, AWS, Render o VPS dedicado $\approx$ \$15 - \$30 USD/mes).
* **Base de Datos Gestionada & Backups:** Incluido en la infraestructura en la nube.
* **Certificado Digital ARCA:** Gratuito (gestionado con clave fiscal en AFIP).
* **Dominio / SSL:** Domain HTTPS ($\approx$ \$10 - \$15 USD/año).

---

## 8. Garantía, Soporte y Mantenimiento Post-Lanzamiento

* **Garantía de Funcionamiento:** Se incluye una **Garantía Operativa de 30 Días de corrido** a partir de la puesta en marcha en producción para corrección sin cargo de cualquier fallo respecto a lo especificado.
* **Soporte Evolutivo (Opcional post-garantía):** Transcurridos los 30 días de garantía, se podrá contratar un abono mensual de mantenimiento o bolsa de horas para incorporar nuevas funcionalidades (Fase 2).

---

## 9. Próximos Pasos para el Inicio del Proyecto

1. Aprobación y firma de la presente propuesta.
2. Tramitación/entrega de credenciales de prueba de ARCA (AFIP).
3. Pago del Anticipo Inicial (Hito 1).
4. **Inicio formal del Sprint 1.**
