# ANV2-01 Diagnostico runtime

Objetivo: reconciliar V2 contra codigo real de `nuevo_nomina`.

Instrucciones:
- Confirmar con lectura directa los cuatro falsos positivos V1.
- Revisar `communicationService`, `.env.example`, `CerrarMes.jsx`, `DescargarReportes.jsx`, app movil y `templateGenerator`.
- Clasificar EMAIL-C01, TZ-C01 y LEG-H01 como vigente, cerrado previo, falso positivo o requiere fase posterior.
- No aplicar cambios funcionales salvo reportes/evidencia.
- Crear `docs2/auditoria-nomina-ec-2026-v2/REPORTE_ANV2_01_DIAGNOSTICO_RUNTIME.md`.
- Actualizar matriz si el codigo contradice la auditoria.
- Commit esperado: `phase: ANV2-01 task: diagnostico runtime`.
