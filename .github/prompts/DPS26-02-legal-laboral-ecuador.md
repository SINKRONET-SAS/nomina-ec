# DPS26-02 legal laboral Ecuador 2026

Objetivo: cerrar matriz laboral Ecuador 2026 con evidencia por modulo.

Requiere aprobacion explicita del usuario.

Tareas:
- Validar contratos, jornada, atrasos, horas extra, decimos, vacaciones, fondos de reserva, IESS y finiquito.
- Confirmar parametros versionados por anio/tenant.
- Agregar pruebas de casos criticos.
- Exponer bloqueos visibles en PWA cuando falte configuracion legal.

Gates:
- `npm.cmd --workspace=backend test -- --runInBand`
- `npm.cmd --workspace=frontend-web run build` si toca PWA.
- Reporte de fase y `AuditLock.json` firmado.
