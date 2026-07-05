# Plan Haiky AIS26 - Assets e iconografia de sistema SKNOMINA 2026

Codigo: `AIS26`

Plan: `HAIKY-ASSETS-ICONOGRAFIA-SISTEMA-SKNOMINA-2026`

Fecha base: 2026-07-05

Repositorio: `nuevo_nomina`

Solicitud:

Corregir definitivamente que el uso de assets es bajo, que el icono de la app no despliega la imagen del sistema y que algunas superficies lo exponen de forma cruda o inconsistente.

Alcance operativo:

- Usar el icono de SKNOMINA como fuente visible de marca en PWA y app movil.
- Alinear `index.html`, manifest PWA, assets generados y configuracion Expo.
- Evitar mojibake en metadatos y textos tocados.
- Agregar contratos automatizados que bloqueen regresiones de iconos, splash, notificaciones y metadatos.
- No crear una identidad visual paralela ni reemplazar branding historico fuera de runtime activo.

Fuera de alcance:

- No cambiar rutas de autenticacion ni contratos backend.
- No redisenar landing completa.
- No sustituir assets de tienda no relacionados con el icono del sistema.
- No tocar planes abiertos ajenos, como `MDS26`, salvo para preservar precedente en AuditLock.

Fases:

## AIS26-00 - Baseline y gobierno

Objetivo: registrar plan, prompts y contexto siguiendo `RULES.md`.

Entregables:

- Plan en `docs2/PLAN_HAIKY_ASSETS_ICONOGRAFIA_SISTEMA_SKNOMINA_2026.md`.
- Prompts `AIS26-00` a `AIS26-04`.
- Contexto en `.github/CODEX_CONTEXT.md`.
- Reporte de ejecucion en `docs2/assets-iconografia-sistema-sknomina-2026/`.

Criterios de cierre:

- Artefactos en `docs2`, `.github/prompts`, `.github/CODEX_CONTEXT.md` y `.vscode/AuditLock.json`.
- `MDS26` queda preservado como precedente y no se arrastran prompts ajenos al commit.

## AIS26-01 - Inventario de assets

Objetivo: confirmar fuentes reales y dimensiones antes de modificar runtime.

Entregables:

- Verificacion de PNG/SVG disponibles para web y mobile.
- Identificacion de incongruencias de tamano o rutas.
- Seleccion de fuente canonica: icono SKNOMINA de app/launcher.

Criterios de cierre:

- `icon-192.png` debe medir 192x192.
- `icon-512.png` debe medir 512x512.
- `apple-touch-icon.png` debe medir 180x180.

## AIS26-02 - Runtime PWA y web

Objetivo: hacer que navegador, PWA, previews y marca visible usen la imagen de sistema.

Entregables:

- `frontend-web/index.html` con favicon SVG, PNG fallback, apple touch y metadatos sin mojibake.
- `frontend-web/pwa.config.js` con iconos PNG y shortcuts consistentes.
- `frontend-web/vite.config.js` copiando `apple-touch-icon.png`.
- `BrandLogo` usando `/icon-512.png` con fallback `/icon.svg`.

Criterios de cierre:

- No quedan metadatos sociales apuntando al screenshot SVG como icono principal.
- La marca visible no depende del JPG institucional para el icono de app.

## AIS26-03 - Runtime mobile Expo

Objetivo: hacer visible el icono real de SKNOMINA en la app y declarar todos los assets de sistema.

Entregables:

- `app-movil/app.json` con `splash` y `notification` declarados.
- `LoginScreen` muestra el icono real con `Image`.
- Textos tocados sin mojibake visible.
- Smoke mobile valida dimensiones y referencias de iconos.

Criterios de cierre:

- La pantalla inicial no queda solo con texto SKNOMINA.
- Expo tiene icono, adaptive icon, splash y notification icon referenciados.

## AIS26-04 - QA, contratos y cierre

Objetivo: cerrar sin regresiones y con evidencia reproducible.

Gates:

- `npm.cmd run contracts`
- `npm.cmd run build:web`
- `npm.cmd --workspace=frontend-web run smoke:pwa`
- `npm.cmd run check:mobile`
- `git diff --check`
- Validacion UTF-8 sin BOM de archivos modificados `.js`, `.mjs`, `.json` y `.md`.

Commit esperado:

`phase: AIS26-04 task: assets iconografia sistema`
