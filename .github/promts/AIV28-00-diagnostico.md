# AIV28-00 - Diagnostico integral V28

## Plan
HAIKY-AUDITORIA-INTEGRAL-V28-NOMINA-EC-2026

## Objetivo
Ejecutar auditoria integral sobre las 4 superficies (LANDING, PWA, BACKEND, MOBILE) con enfoque en cumplimiento legal Ecuador 2026, motor de calculo de nomina, seguridad y calidad de codigo.

## Tareas

1. Escanear automatizadamente los archivos de las 4 superficies.
2. Verificar parametros legales Ecuador 2026 contra fuentes oficiales (SRI, Ministerio del Trabajo, IESS).
3. Reconfirmar cada hallazgo contra el codigo fuente para descartar falsos positivos.
4. Generar informe diagnostico en `docs2/auditoria-integral-v28-nomina-ec-2026/INFORME_DIAGNOSTICO.md`.
5. Generar JSON estructurado en `docs2/auditoria-integral-v28-nomina-ec-2026/DIAGNOSTICO_JSON.json`.
6. Evaluar migracion a Python con tabla comparativa.
7. Generar plan Haiky de respuesta en `docs2/PLAN_HAIKY_AUDITORIA_INTEGRAL_V28_NOMINA_EC_2026.md`.

## Criterios de aceptacion

- Informe con hallazgos reconfirmados y falsos positivos descartados.
- JSON con findingSummary y legalCompliance.
- Plan con fases AIV28-00 a AIV28-05.
- RULES.md: UTF-8, zero silent failures, zero regresiones, AuditLock.

## Dependencias

- Acceso lectura a todo el repositorio.
- No requiere base de datos ni entorno de ejecucion.
