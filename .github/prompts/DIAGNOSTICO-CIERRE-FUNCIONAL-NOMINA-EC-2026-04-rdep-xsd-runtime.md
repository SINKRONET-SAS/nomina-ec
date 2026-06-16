# DCF26-04 - RDEP XSD runtime

Plan: `HAIKY-DIAGNOSTICO-CIERRE-FUNCIONAL-NOMINA-EC-2026`  
Prioridad: P0

## Objetivo

Convertir RDEP de generador basico a flujo productizable con precheck, XSD validation y evidencia.

## Alcance

- Confirmar fuente/ficha tecnica vigente documentada para el ejercicio fiscal objetivo.
- Validar XML contra XSD versionado antes de subir o devolver URL.
- Crear precheck UI: datos empresa, empleados, retenciones, nomina cerrada, fuente legal, XSD.
- Guardar evidencia de validacion con correlationId.

## Reglas

- No declarar cumplimiento tributario total.
- No generar XML oficial si el precheck falla.
- No usar ATS como sustituto.
- No usar datos reales en demos.

## Entregables

- Servicio RDEP con validacion XSD.
- UI de precheck y descarga.
- Tests con XML valido e invalido.
- Reporte `REPORTE_DCF26_04_RDEP_XSD_RUNTIME.md`.

## Gates

- Test RDEP XSD.
- Backend tests.
- Frontend build.
