# REPORTE APK26-08 - Parametrizacion y FCM

## Parametrizacion

- `frontend-web/src/pages/Configuracion/Parametrizacion.jsx` conserva un tamano alto.
- Ya existen componentes/helper extraidos en `frontend-web/src/pages/Configuracion/parametrizacion/`.
- APK26 no ejecuta refactor masivo porque el objetivo prioritario es Play Store/Superadmin y el build esta verde.
- Regla de cierre: no ampliar `Parametrizacion.jsx` con nuevas secciones grandes; nuevas capacidades deben ir a componentes dedicados.

## FCM

- Google services/FCM no se configura en APK26.
- Riesgo no bloqueante mientras no se habiliten push notifications productivas.
- Si se activa push, debe abrirse fase con `google-services.json` gestionado como secreto/artefacto de build, no como archivo publico.

