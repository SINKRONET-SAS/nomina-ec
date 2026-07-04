# AISK26-02: Ortografia y UTF-8 Homologacion

**Plan:** HAIKY-AUDITORIA-INTEGRAL-SKNOMINA-2026
**Fase:** 02
**Prerequisito:** AISK26-01 firmado
**Hallazgos:** HAL-10..13 (MEDIO/BAJO)

## Objetivo

Corregir tildes faltantes en texto visible al usuario en los 3 workspaces y homologar templates de email.

## Tareas

### App movil (HAL-10)
1. GastosMovilizacionScreen.js: "Periodo" -> "Periodo" (ya correcto sin tilde en este contexto), verificar "codigo", "justificacion"
2. PermisosScreen.js: "justificacion" -> "justificacion" en labels visibles
3. LoginScreen.js: verificar "Ubicacion" -> "Ubicacion"
4. AutoservicioScreen.js: "aun no esta" -> "aun no esta" con tildes
5. MarcacionScreen.js: "Ubicacion pendiente" -> con tilde
6. MisMarcacionesScreen.js: verificar texto visible

### Frontend-web (HAL-11)
7. operationalModules.js: "Ubicacion obligatoria" -> con tilde
8. NovedadesPendientes.jsx: verificar placeholders

### Backend (HAL-12)
9. monthlyPeriodService.js: "invalido" -> "invalido" en mensajes API
10. communicationService.js: "electronico invalido" -> con tildes
11. reporteController.js: "ano valido" -> con tildes

### Email templates (HAL-13)
12. Homologar "codigo de verificacion" vs "Codigo" en templates de email

## Gate

- Zero texto visible sin tildes en screens auditados
- git diff --check PASS
- UTF-8 sin BOM en todos los archivos modificados

## Commit

phase: AISK26-02 task: ortografia-utf8
