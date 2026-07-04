# AISK26-08: UI/UX Humanizacion

**Plan:** HAIKY-AUDITORIA-INTEGRAL-SKNOMINA-2026
**Fase:** 08
**Prerequisito:** AISK26-07 firmado
**Hallazgos:** HAL-01..06 (MEDIO/BAJO)

## Objetivo

Mejorar experiencia visual y usabilidad en app movil y PWA.

## Tareas

### Tab bar overflow (HAL-02)
1. App.js: evaluar consolidar tabs de 6 a 5 (ej: combinar Historial dentro de Autoservicio)
2. Alternativa: usar iconos sin texto en tabs secundarios para ganar espacio
3. Verificar en pantalla 320px que no hay clipping

### ErrorBoundary (HAL-06)
4. Crear app-movil/src/components/ErrorBoundary.js:
   - Captura crashes de React
   - Muestra pantalla "Ocurrio un error" con boton "Reintentar"
   - Log del error para diagnostico
5. Envolver navegacion en App.js con ErrorBoundary

### Botones de ruta (HAL-03)
6. RutaHoyScreen: "Llegue" -> "Marcar llegada" con icono check
7. "Sali" -> "Marcar salida" con icono arrow-right
8. Agregar diferenciacion de color (verde=llegada, naranja=salida)

### DatePicker (HAL-04)
9. PermisosScreen: reemplazar TextInput de fechas con @react-native-community/datetimepicker
10. Mostrar calendario nativo al tocar el campo

### Botones marcacion (HAL-05)
11. MarcacionScreen: agregar iconos y colores semanticos a los 4 botones
12. Entrada=verde, Almuerzo salida=naranja, Almuerzo entrada=azul, Salida=rojo

### Dark mode foundation (HAL-01)
13. app.json: cambiar userInterfaceStyle a "automatic"
14. Crear app-movil/src/theme/colors.js con paleta light/dark
15. No aplicar dark mode completo en esta fase, solo la base y las pantallas principales

## Gate

- Sin text clipping en 360px
- ErrorBoundary captura crashes
- DatePicker nativo en permisos
- Botones con iconos y colores semanticos
- Build mobile PASS

## Commit

phase: AISK26-08 task: uiux-humanizacion
