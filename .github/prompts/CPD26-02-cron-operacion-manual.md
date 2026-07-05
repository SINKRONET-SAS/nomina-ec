# CPD26-02 - Cron fuera de produccion inicial

Objetivo: retirar el worker cron del blueprint inicial para reducir costo y evitar calculos automaticos de nomina antes de revision operativa.

Tareas:

- Eliminar `sknomina-worker-cron` de `render.yaml`.
- Documentar que roles PDF y archivos bancarios se generan desde backend API.
- Mantener `backend/src/config/cron-jobs.js` en codigo para reintroduccion futura controlada.
- Proteger con contrato que el worker no vuelva al blueprint inicial CPD26.

Validacion minima: `npm.cmd run contracts`.
