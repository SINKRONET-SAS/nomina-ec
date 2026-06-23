# Reporte CRS26-03 - Backend CRUD de cargos y rangos salariales

## Alcance ejecutado

CRS26-03 habilita `jobPositions` como recurso real de configuracion del backend. El catalogo queda gobernado por tenant, unidad organizativa, vigencia, estado y rango salarial minimo/maximo.

## Cambios runtime

- `configurationService` expone el recurso `jobPositions` en la API generica de parametrizacion.
- Se aceptan alias de frontend/API como `organizationUnitId`, `organizationUnitCode`, `salaryMin`, `salaryMax`, `effectiveFrom` y `effectiveTo`.
- El cargo valida que la unidad organizativa pertenezca al tenant y este activa.
- El rango salarial bloquea valores negativos, montos no numericos y `salary_max < salary_min`.
- El estado queda limitado a `activo`, `inactivo` o `archivado`.
- La duplicidad de codigo por tenant devuelve error funcional `JOB_POSITION_CODE_DUPLICATED`.
- La eliminacion queda bloqueada si existen consumos en empleados, nominas, documentos legales o lotes de novedades por cargo.
- El checklist operativo incorpora cargos y rangos salariales como paso visible.

## Pruebas ejecutadas

- `npm.cmd test -- configurationService.test.js` en `backend`: PASS.

## Evidencia

- Tests agregados para crear cargos con unidad activa y alias de frontend.
- Tests agregados para bloquear eliminacion cuando el cargo ya esta asociado a empleados.

## Riesgos residuales

- La pantalla PWA de parametrizacion consume el recurso en CRS26-04.
- Alta/edicion/importacion de empleados consumen la tabla real en CRS26-05.
- Reportes, novedades y nomina completan compatibilidad historica en CRS26-06.
