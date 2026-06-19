# Plan Haiky - HAIKY-DIAGNOSTICO-INTEGRAL-COMERCIAL-UI-CALIDAD-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-DIAGNOSTICO-INTEGRAL-COMERCIAL-UI-CALIDAD-2026 |
| Codigo | DIC26 |
| Estado | DIC26-00..08 ejecutadas localmente |
| Fase actual | DIC26-08 cerrada localmente |
| Alcance | diagnostico integral de diseno, UI/UX, oferta comercial visible, accesos, codigo muerto, bugs, importaciones, errores, mojibake y UTF-8 |
| Repo objetivo | `C:\proyectos web\nuevo_nomina` |
| Matriz | `docs2/diagnostico-integral-comercial-ui-calidad-2026/MATRIZ_DIC26_HALLAZGOS.md` |
| AuditLock | `.vscode/AuditLock.json` |
| Prompts | `.github/prompts/DIAGNOSTICO-INTEGRAL-COMERCIAL-UI-CALIDAD-2026-{00..08}-*.md` |
| RULES | `RULES.md` |

## Objetivo

DIC26 revisa la experiencia completa de Nomina-Ec desde una mirada comercial y operativa: lo que ve una empresa antes de contratar, lo que ve el owner al ingresar, lo que usa el empleado en la app movil y lo que el codigo deja como promesa o deuda tecnica.

El plan evita cambios cosmeticos sin impacto. Cada hallazgo se clasifica por riesgo de confianza, operacion, seguridad, mantenimiento o release.

## Fases

| Fase | Prioridad | Estado | Resumen |
|------|-----------|--------|---------|
| DIC26-00 | P0 | completed_documental | Baseline, reglas, contexto, candado y alcance. |
| DIC26-01 | P0 | completed_local | Diagnostico integral de rutas, pantallas, logs, imports, dependencias y encoding. |
| DIC26-02 | P0 | completed_local | Oferta comercial visible en landing y reduccion de friccion publica. |
| DIC26-03 | P0 | completed_local | Accesos web: ojo de clave en login, registro y recuperacion. |
| DIC26-04 | P0 | completed_local | App movil enfocada en asistencia: marcacion, historial y perfil visibles. |
| DIC26-05 | P1 | completed_local | Codigo muerto/dependencias/permisos: retiro de camara y navegacion movil no usada. |
| DIC26-06 | P0 | completed_local | UTF-8 sin BOM y cero mojibake literal en archivos auditados. |
| DIC26-07 | P0 | completed_local | QA, evidencia, AuditLock, commit y push. |
| DIC26-08 | P0 | completed_local | Cierre de residuales: chunks Vite y vulnerabilidades Dependabot/npm audit. |

## Reglas DIC26

- No cambiar calculos legales ni contratos API fuera del alcance de la auditoria comercial/UX/calidad.
- No introducir mensajes que prometan cumplimiento total, aprobacion estatal o automatizacion no existente.
- No mantener permisos moviles que la app no usa.
- No cerrar si el gate UTF-8 detecta BOM o mojibake literal.
- Toda mejora de acceso debe quedar visible en pantalla.
- Commits esperados: `phase: DIC26-XX task: ...`.

## Resultado local

- Landing con bloque de oferta comercial visible.
- Login, registro y recuperacion web con boton de mostrar/ocultar contrasena.
- App movil con tabs simples: marcar, historial y perfil.
- Retirados `expo-camera`, permisos de camara y dependencias de navegacion no usadas.
- Gate global UTF-8/BOM/mojibake ejecutado y limpio.
- Warning de chunk Vite cerrado con `manualChunks`; mayor chunk runtime queda bajo 500 kB.
- `npm audit --audit-level=low` queda limpio en `frontend-web`, `backend` y `app-movil`.
