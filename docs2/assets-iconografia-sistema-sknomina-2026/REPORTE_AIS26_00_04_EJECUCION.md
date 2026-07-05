# Reporte AIS26 00-04 - Ejecucion

Plan: `HAIKY-ASSETS-ICONOGRAFIA-SISTEMA-SKNOMINA-2026`

Codigo: `AIS26`

Estado: completado con gates PASS

Fecha: 2026-07-05

## Necesidad atendida

El sistema tenia assets de iconografia disponibles, pero el uso era incompleto: la PWA no declaraba todos los enlaces esperados en HTML, los metadatos sociales apuntaban a screenshots SVG, `icon-192.png` no media 192x192 y la app movil no mostraba el icono real en el login ni declaraba splash/notificacion en Expo.

## Decisiones

- La fuente visible del icono de sistema es el set SKNOMINA: `icon-512.png`, `icon.svg`, `icon-192.png`, `apple-touch-icon.png` y assets Expo.
- `BrandLogo` usa el icono de app, no el JPG institucional, para evitar exposicion cruda o inconsistente.
- La app movil muestra el icono real en el login para que el usuario lo vea tambien dentro de la experiencia.
- Los smokes validan dimensiones y referencias; no se confia solo en que el archivo exista.

## Ejecucion por fase

AIS26-00:

- Plan, prompts, contexto y reporte creados en `docs2` y `.github`.

AIS26-01:

- Se verificaron assets existentes de PWA y Expo.
- Se corrigieron dimensiones reales de `icon-192.png` y `icon-512.png`.
- Se genero `apple-touch-icon.png` de 180x180.

AIS26-02:

- HTML, manifest PWA, Vite PWA y `BrandLogo` quedan alineados al icono de sistema.
- Los metadatos de descripcion y previews quedan sin mojibake.

AIS26-03:

- Expo declara splash y notification icon.
- `LoginScreen` muestra `assets/icon.png` con `Image` y corrige textos tocados.
- `check-store-readiness` valida referencias y dimensiones.

AIS26-04:

- `scripts/verify-system-contracts.mjs` y `frontend-web/scripts/smoke-pwa-lpa26.mjs` bloquean regresiones.
- `AuditLock.json` se actualiza con firma SHA-256 y MDS26 preservado como precedente.

## Riesgos controlados

- No se cambia API publica ni autenticacion.
- No se crea marca paralela.
- No se tocan prompts `MDS26-*` no relacionados.
- La UI usa fallback SVG si el PNG de marca no carga.

## Gates

- PASS: `npm.cmd run contracts`
- PASS: `npm.cmd run build:web`
- PASS: `npm.cmd --workspace=frontend-web run smoke:pwa`
- PASS: `npm.cmd run check:mobile`
- PASS: `git diff --check`
- PASS: UTF-8 sin BOM de archivos modificados `.js`, `.mjs`, `.json` y `.md`.
