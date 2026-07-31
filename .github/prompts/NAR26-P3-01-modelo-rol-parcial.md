# NAR26-P3-01 — Modelo operativo de roles parciales

Implementa en la ruta existente de Nómina:

- resolución por línea `descontar` o `bonificar`, persistida en metadata y visible en API/reporte;
- compatibilidad con cargas de cuatro columnas;
- endpoint idempotente para aplicar las resoluciones declaradas de un rol aprobado;
- auditoría y mensajes en español.

Verifica que `descontar` conserve el vínculo con el beneficio que consume el rol de cierre y que `bonificar` conserve el vínculo con la novedad aprobada que consume el rol de cierre. No alteres roles cerrados ni crees rutas paralelas.

