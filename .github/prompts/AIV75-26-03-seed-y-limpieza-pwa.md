# AIV75-26-03 — Seed vigente y limpieza PWA

Requiere aprobación explícita y `AIV75-26-02` firmado.

Verifica `backend/scripts/seed-superadmin-owner.js` sin crear un segundo seed: dos ejecuciones equivalentes no deben duplicar usuario ni tenant; las variables faltantes deben fallar de forma clara; ninguna credencial puede aparecer en logs o fixtures reales. Documenta y prueba la política vigente de verificación de correo para `superadmin`.

En `frontend-web/src/pages/Nomina/DescargarReportes.jsx`, elimina únicamente la segunda llamada consecutiva a `setError(nextError)` dentro de `validarSae`. Conserva contrato API, mensaje y estados.

Ejecuta pruebas enfocadas y build PWA; actualiza AuditLock con resultados reales.
