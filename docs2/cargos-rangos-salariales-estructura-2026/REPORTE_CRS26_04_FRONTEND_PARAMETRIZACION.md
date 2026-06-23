# Reporte CRS26-04 - Parametrizacion PWA de cargos y puestos

## Alcance ejecutado

CRS26-04 agrega la categoria "Cargo o puesto" en la pantalla de parametrizacion operativa. El usuario OWNER/RRHH puede crear, editar, inactivar, archivar o eliminar cargos si el backend confirma que no tienen consumos.

## Cambios runtime

- Nueva categoria `Cargo o puesto` en `frontend-web/src/pages/Configuracion/Parametrizacion.jsx`.
- El formulario consume unidades organizativas reales mediante `resourceSelect`.
- Campos visibles: unidad organizativa, codigo, nombre, sueldo minimo, sueldo maximo, moneda, vigencia, estado y descripcion.
- El payload usa el recurso backend `jobPositions`.
- Los registros existentes muestran unidad y rango salarial para evitar duplicados invisibles.
- El avance operativo incluye `Cargos` como metrica y paso de onboarding.

## Verificacion

- `npm.cmd run build` en `frontend-web` genero `dist/` y reporto `built in 2m 31s`.
- El proceso quedo vivo despues de imprimir la salida de exito y se cerro manualmente con `taskkill /PID 7692 /F`; por eso no se registra como salida 0 estricta.

## Riesgos residuales

- CRS26-05 debe cambiar alta, edicion e importacion de empleados para seleccionar cargo desde tabla real.
- CRS26-06 debe ajustar filtros/reportes/novedades por cargo real y mantener snapshot historico.
