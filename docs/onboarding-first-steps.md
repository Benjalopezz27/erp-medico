# Primeros pasos y carteles contextuales

Guía no bloqueante para administradores (issue #239). No impide ninguna operación.

- **Progreso calculado:** `GET /config/onboarding-status` (admin) evalúa con consultas de existencia si cada paso tiene datos (fiscal, usuarios, categorías y unidades, productos, clientes o proveedores, tesorería, stock). No se guarda estado de pasos.
- **Bloque "Primeros pasos"** en el Inicio: se oculta al descartarlo o al completar los siete pasos.
- **Carteles** en Productos, Compras y Ventas: una vez por pantalla.
- **Descarte:** se persiste en `system_settings` (puesto único, vale para todos los equipos). Para volver a mostrar uno, borrar su fila.

| Clave                                               | Efecto                             |
| --------------------------------------------------- | ---------------------------------- |
| `onboarding_dismissed`                              | Oculta el bloque de primeros pasos |
| `hint_dismissed_products` / `_purchases` / `_sales` | Oculta el cartel de esa pantalla   |

Endpoints: `POST /config/onboarding/dismiss`, `POST /config/hints/:id/dismiss`.

El certificado ARCA no se sube desde la UI: se configura por entorno del servidor.
