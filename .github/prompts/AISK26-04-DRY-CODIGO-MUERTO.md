# AISK26-04: Codigo Duplicado, Muerto y DRY

**Plan:** HAIKY-AUDITORIA-INTEGRAL-SKNOMINA-2026
**Fase:** 04
**Prerequisito:** AISK26-03 firmado
**Hallazgos:** HAL-22..25, HAL-130..132

## Objetivo

Extraer funciones duplicadas a modulos compartidos y eliminar codigo muerto justificadamente.

## Tareas

### Extraccion DRY
1. Extraer money() a frontend-web/src/utils/money.js y refactorizar:
   - payrollRolePdfService.js:20
   - HistorialEmpleado.jsx:14
   - MovilizacionAprobacion.jsx:6-8
   - AutoservicioScreen.js:28
2. Reusar dateEC.js creado en fase 03 (ya extraido)

### Codigo muerto
3. Eliminar paymentAPI de app-movil/src/services/api.js (lineas 43-46, nunca consumido)
4. Eliminar authAPI.publicRegister de api.js (linea 38, sin pantalla de registro publico en mobile)

### Rutas duplicadas
5. Deprecar /api/pagos/banco/* en favor de /api/reportes/banco/* (eliminar o agregar redirect 301)
6. Documentar endpoints legacy /api/marcaciones/* como candidatos a eliminacion futura (RBAC agregado en fase 01)

## Gate

- money() en modulo unico, 4 consumidores refactorizados
- Zero exports muertos en api.js mobile
- Build PASS en los 3 workspaces

## Commit

phase: AISK26-04 task: dry-codigo-muerto
