# HRD26-03 Legal Ecuador 2026

Base: `RULES.md` y fase HRD26-02 firmada.

Objetivo: reconfirmar cumplimiento legal Ecuador 2026 sin falsos positivos.

Fuentes:

- SRI Impuesto a la Renta: https://www.sri.gob.ec/impuesto-renta
- SRI tablas IR 2026: PDF oficial enlazado por SRI.
- Ministerio del Trabajo sistema salarial: https://salarios.trabajo.gob.ec/
- IESS empleador: https://www.iess.gob.ec/es/web/empleador/avisos-de-entrada-y-salida

Checks:

- `backend/src/config/legal-ecuador.js` tiene `sourceStatus: 'validado'` para 2026.
- SBU 2026, aportes IESS y tabla IR 2026 estan versionados.
- El diagnostico distingue fuente oficial, parametro local y bloqueo pendiente cuando aplique.

Salida:

- Informe en `docs2/reportes-disponibilidad-clientes-2026/INFORME_DIAGNOSTICO.md`.
