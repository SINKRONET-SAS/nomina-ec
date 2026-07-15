# AIV28-03 - PWA y Landing: calidad

## Plan
HAIKY-AUDITORIA-INTEGRAL-V28-NOMINA-EC-2026

## Objetivo
Confirmar mitigaciones de H-09 (tokens localStorage) y H-10 (console.error). Verificar accesibilidad y build produccion.

## Tareas

1. **H-09**: Confirmar mitigaciones existentes:
   - CSP headers via Helmet en backend.
   - Auto-logout en 401/403 en `authenticatedApi.js`.
   - No hay `dangerouslySetInnerHTML` en el frontend.
   - Documentar riesgo aceptado en CODEX_CONTEXT.

2. **H-10**: Verificar que console.error son logs de error, no debug:
   - AuthContext.jsx: error de lectura/refresco de sesion (aceptable).
   - ErrorBoundary.jsx: error de componente (aceptable).
   - CookieConsent.jsx: error de localStorage (aceptable).
   - Confirmar que no hay console.log sueltos.

3. Verificar accesibilidad basica:
   - Alt tags en imagenes.
   - Aria-labels en botones interactivos.
   - Semantica HTML (section, article, nav).
   - Key props en listas.

4. Ejecutar build produccion: `npm --workspace=frontend-web run build`.

## Criterios de aceptacion

- Build PWA exitoso sin errores.
- Mitigaciones de tokens documentadas.
- No se modifica logica de autenticacion.
- RULES.md: zero regresiones, exposicion frontend.

## Archivos revisados

- `frontend-web/src/services/authStorage.js`
- `frontend-web/src/context/AuthContext.jsx`
- `frontend-web/src/components/ErrorBoundary.jsx`
- `frontend-web/src/pages/Landing.jsx`
