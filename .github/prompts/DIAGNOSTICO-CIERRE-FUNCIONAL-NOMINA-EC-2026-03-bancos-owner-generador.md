# DCF26-03 - Bancos OWNER conectados al generador

Plan: `HAIKY-DIAGNOSTICO-CIERRE-FUNCIONAL-NOMINA-EC-2026`  
Prioridad: P0

## Objetivo

Hacer que la configuracion bancaria del OWNER gobierne el archivo plano real, con validaciones por ficha tecnica y fallback controlado.

## Alcance

- Leer `perfiles_bancarios` por tenant antes de usar `bank-file-profiles.json`.
- Validar columnas, encoding, separador, cabecera, trailer, longitud de cuenta y fecha.
- Mostrar en frontend que perfil se usara para generar el archivo.
- Registrar auditoria con checksum y version de perfil.

## Reglas

- No generar archivo productivo si el perfil esta incompleto o sin validacion requerida.
- No exponer cuentas bancarias completas en UI, logs o Excel de revision.
- No usar datos reales en pruebas.

## Entregables

- Servicio bancario tenant-aware.
- Tests unitarios con perfil tenant y fallback.
- UI con precheck antes de generar.
- Reporte `REPORTE_DCF26_03_BANCOS_OWNER_GENERADOR.md`.

## Gates

- Backend tests.
- Frontend build.
- Archivo DEMO generado desde perfil tenant ficticio.
