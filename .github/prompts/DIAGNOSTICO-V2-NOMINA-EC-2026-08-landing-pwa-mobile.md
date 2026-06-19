# DVN26-08 - Landing, PWA y app movil

Plan: `HAIKY-DIAGNOSTICO-V2-NOMINA-EC-2026`  
Prioridad: P1.

## Objetivo

Resolver F-05, F-06, F-07 y T-02: confianza comercial, PWA completa y mobile enfocado en asistencia.

## Reglas

- No prometer cumplimiento total sin evidencia.
- Service worker no puede cachear `/api` ni datos personales.
- Mobile debe priorizar registro de asistencia: login, ubicacion, inicio/fin, errores visibles.

## Entregables

- Landing revisada contra falsas promesas.
- PWA con manifest, iconos, screenshots, robots/sitemap y smoke.
- App movil usable en Expo Go para marcacion.
- Reporte `REPORTE_DVN26_08_LANDING_PWA_MOBILE.md`.

## Gate

Frontend build, smoke PWA, expo-doctor y prueba LAN/Expo Go.
