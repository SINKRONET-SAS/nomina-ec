# PNE26-16 - QA end-to-end y release productizable

Ejecutar solo con aprobacion explicita.

Objetivo: validar que Nomina-Ec puede demostrarse comercialmente con evidencia tecnica.

Flujo minimo:
1. Registro de empresa.
2. Onboarding OWNER.
3. Parametros legales.
4. Empleado.
5. Marcacion.
6. Novedad.
7. Nomina.
8. Rol PDF.
9. Archivo bancario.
10. Reporte.
11. Cambio de plan o pago sandbox.

Validaciones:
- Tests backend criticos.
- Build frontend.
- `npx expo-doctor`.
- Smoke local con PostgreSQL y Redis.
- Smoke Render si hay entorno disponible.
- Evidencia sin secretos.
- Reporte `docs/REPORTE_PNE26_16_QA_RELEASE.md`.
- AuditLock firmado.

No hacer:
- No declarar release productivo sin validacion legal/contable externa.
