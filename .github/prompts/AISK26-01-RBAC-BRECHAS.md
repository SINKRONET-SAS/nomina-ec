# AISK26-01: Cierre de Brechas RBAC

**Plan:** HAIKY-AUDITORIA-INTEGRAL-SKNOMINA-2026
**Fase:** 01
**Prerequisito:** AISK26-00 firmado
**Hallazgos:** HAL-30, HAL-31 (ALTO), HAL-32..35 (MEDIO)

## Objetivo

Cerrar 6 endpoints sin proteccion RBAC en backend/src/app.js. Cualquier usuario autenticado puede acceder a datos sensibles de nomina, marcaciones y documentos.

## Tareas

1. POST /api/marcaciones (app.js:156): agregar requireRole('empleado','owner','admin_rrhh','supervisor')
2. GET /api/marcaciones/hoy (app.js:158): agregar requireRole con mismos roles
3. GET /api/novedades y /api/novedades/pendientes (app.js:194-195): requireRole('owner','admin_rrhh','supervisor')
4. GET /api/nomina/:id/rol-pdf y /api/nomina/:anio/:mes (app.js:219-221): requireRole('owner','admin_rrhh') con filtrado por tenant
5. GET /api/documentos y /api/documentos/:id/download (app.js:232-233): requireRole('owner','admin_rrhh')
6. GET /api/reportes/asistencia/:anio/:mes (app.js:248): requireRole('owner','admin_rrhh','supervisor')
7. Agregar tests en app.routes.test.js para cada ruta protegida

## Consideraciones

- Verificar que empleado solo accede a sus propios datos via /api/mobile/*
- No romper flujo PWA existente que usa estos endpoints con token de owner/admin
- requireRole ya existe como middleware en middleware/auth.js

## Gate

- 6 endpoints protegidos con requireRole
- Tests PASS para cada ruta
- Flujo PWA owner/admin sigue funcionando

## Commit

phase: AISK26-01 task: cierre-brechas-rbac
