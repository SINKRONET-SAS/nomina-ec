# DCF26-05 - Retirar ATS del flujo de nomina

Plan: `HAIKY-DIAGNOSTICO-CIERRE-FUNCIONAL-NOMINA-EC-2026`  
Prioridad: P0

## Objetivo

Eliminar la exposicion de ATS como reporte de nomina y evitar que vuelva a confundirse con RDEP.

## Alcance

- Retirar o aislar `/api/reportes/ats` del flujo protegido de nomina.
- Remover `sriAtsGenerator` de rutas y controladores de nomina.
- Si se conserva codigo por historia, moverlo a archivo no runtime o marcarlo como obligacion tributaria general no habilitada.
- Actualizar docs y pruebas.

## Reglas

- RDEP es el anexo de relacion de dependencia.
- ATS no debe aparecer en menus, reportes de nomina ni endpoints operativos de nomina.
- No romper reportes RDEP/SAE/banco.

## Entregables

- Runtime sin endpoint ATS de nomina.
- `rg "reportes/ats|generarATS|generarXML_ATS"` limpio en runtime o justificado fuera de runtime.
- Reporte `REPORTE_DCF26_05_RETIRAR_ATS_NOMINA.md`.

## Gates

- Backend tests.
- Frontend build.
- Smoke de reportes RDEP/SAE/banco.
