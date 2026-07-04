# AISK26-10: QA Release y Cierre AuditLock

**Plan:** HAIKY-AUDITORIA-INTEGRAL-SKNOMINA-2026
**Fase:** 10
**Prerequisito:** AISK26-09 firmado

## Objetivo

Ejecutar suite completa de verificacion, sellar AuditLock y generar reporte de cierre.

## Tareas

### Gates automatizados
1. npm run contracts PASS
2. npm run prisma:validate PASS
3. npm --workspace=backend test PASS
4. npm --workspace=frontend-web run build PASS
5. npm run check:mobile PASS
6. git diff --check PASS
7. UTF-8 sin BOM en todos los archivos modificados

### Verificacion funcional
8. Flujo RBAC: verificar que endpoints protegidos rechazan usuarios sin rol
9. Flujo movilizacion: cierre mensual, sugerencia entre paradas, anticipo en nomina
10. Flujo autoservicio: rol PDF en app, adjunto medico, notificacion
11. Flujo offline: envio encolado, reintento automatico
12. Flujo legal: calculo nomina con parametros 2025 y 2026

### Cierre
13. Generar reporte en docs2/auditoria-integral-sknomina-2026/REPORTE_AISK26_EJECUCION.md
14. Actualizar .vscode/AuditLock.json con status completed-pass y firma SHA256
15. Actualizar .github/CODEX_CONTEXT.md con plan cerrado

## Gate

- Todos los checks PASS
- 45 hallazgos con estado final documentado
- AuditLock sellado
- CODEX_CONTEXT actualizado

## Commit

phase: AISK26-10 task: qa-release-cierre
