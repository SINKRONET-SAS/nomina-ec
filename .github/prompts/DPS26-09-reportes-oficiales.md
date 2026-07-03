# DPS26-09 reportes oficiales y trazables

Objetivo: cumplir la promesa comercial de reportes oficiales vigentes 2026.

Requiere aprobacion explicita del usuario.

Promesa P0:
- RDEP.
- Formulario 107 PDF individual anual.
- SAE IESS.
- Reportes internos con datos trazables.

Tareas:
- Reconciliar RDEP contra ficha, estructura, catalogos y periodo vigente 2026.
- Generar Formulario 107 como PDF individual por trabajador, consistente con RDEP.
- Validar SAE IESS contra estructura vigente o bloquear descarga con mensaje comercial.
- Asegurar trazabilidad de reportes internos: fuente, filtros, periodo, usuario, fecha y hash.
- Agregar snapshots y tests de consistencia de totales.

Gates:
- Tests backend de reportes.
- Validadores estructurales cuando existan.
- Build frontend si toca PWA.
- Reporte de fase y `AuditLock.json` firmado.
