# Plan Haiky NAR26-P2 - Asistencia, roles de anticipos y reportes

## Objetivo

Realizar una segunda pasada funcional sobre NAR26 para que las capacidades sean operables y verificables en una sola ruta: calcular y exponer los dias laborables de asistencia como novedades informativas, estandarizar roles de anticipos con tipos parametrizados, filtros, carga masiva y descarga, y evitar que los nombres de reportes fallen por concatenar columnas.

## Hallazgos confirmados

1. La carga manual o masiva de asistencia crea marcaciones, pero no deja una novedad trazable por cada dia laborable calculado ni la expone en el reporte de asistencia.
2. Anticipos y bonificaciones tiene un formulario distinto al resto de novedades: no filtra roles, no permite carga masiva desde archivo, no ofrece un reporte consolidado filtrado y permite escribir el tipo de novedad libremente.
3. El nombre de archivo de reportes incorpora `columns` completo y puede superar el limite del sistema operativo, generando `ENAMETOOLONG`.
4. La pantalla móvil de autoservicio recibe `permisos` y `documentos` en `mobileAPI.history()`, pero no los presenta al empleado.

## Alcance

- Agregar el tipo parametrizado informativo `dia_laborado`, generar novedades idempotentes desde la carga de asistencia y exponer dias laborables calculados, dias con novedad y dias sin marcacion.
- Mantener la semantica de nomina: `dia_laborado` es informativo y no genera ingreso ni descuento. Las faltas siguen requiriendo aprobacion explicita.
- Hacer que el rol de anticipos consulte tipos activos, acepte cedula en la carga, ofrezca plantilla y selector de archivo, filtre por periodo/estado/tipo/busqueda y descargue reporte detallado filtrado.
- Mantener la ruta unica de Anticipos y prestamos para decidir descuento o bonificacion. El nombre de bonificacion sigue siendo proporcionado por el usuario y cada bonificacion se registra como la novedad parametrizada elegida.
- Limitar el sufijo de alcance de nombres de reportes a filtros de alcance seguros y acotados; las columnas quedan en la evidencia del reporte, nunca en el nombre del archivo.
- Exponer en `app-movil` una pestaña de permisos concedidos con soportes y documentos disponibles, respetando la respuesta real del backend y sin crear otra ruta.

## Fuera de alcance

- No crear otra ruta de anticipos ni cambiar el calculo de faltas.
- No convertir la ausencia de marcacion en falta automatica.
- No modificar otros repositorios; `app-movil` forma parte de la superficie autorizada de `nuevo_nomina`.

## Fases y gates

| Fase | Entregable | Gate |
|---|---|---|
| NAR26-P2-00 | Gobierno, diagnostico y cadena AuditLock | Artefactos validos y lock encadenado a NAR26-07 |
| NAR26-P2-01 | Dias laborables como novedades y reporte de asistencia | Tests del servicio, migracion valida y UI con columnas nuevas |
| NAR26-P2-02 | Roles de anticipos estandarizados | Tipos activos, filtros, carga por archivo, reportes y tests |
| NAR26-P2-03 | Nombres seguros, regresion y cierre | Suite completa, contratos, Prisma, parseo JSX web/mobile, diff, lock cerrado |

## Criterios de aceptacion

- Una carga de asistencia de rango crea como maximo una novedad `dia_laborado` por empleado/fecha, es idempotente y queda con origen auditable.
- El reporte mensual muestra dias laborables calculados, dias con marcacion, dias con novedad laboral y dias sin marcacion.
- El rol de anticipos usa un select de tipos activos, permite CSV por cedula, filtra la lista y descarga el resultado filtrado.
- Un reporte con 80 columnas y filtros extensos produce un nombre seguro menor a 180 caracteres y sin nombres de columnas.
- Autoservicio móvil muestra permisos concedidos y documentos, incluidos enlaces de soporte cuando el backend los entrega.
- La regresion no deja suites fuera por dependencias nativas ni por herramientas ausentes sin diagnostico accionable.

## Validacion y cierre

- `npm.cmd --workspace=backend test -- --runInBand`
- `npx prisma validate --schema backend/prisma/schema.prisma`
- `node --check` sobre backend modificado
- parseo estatico de JSX con esbuild sobre las tres pantallas modificadas y `git diff --check`
- cierre de AuditLock con firma SHA256 encadenada

## Cierre NAR26-P2-03

- Estado: `closed`.
- Backend: 65 suites y 437 pruebas PASS; el binding nativo `libxmljs2` estuvo disponible durante la regresion.
- Contratos: `node scripts/verify-system-contracts.mjs` PASS.
- Prisma: `prisma validate` PASS.
- Frontend: parseo JSX PASS en `Beneficios.jsx`, `ReporteAsistencia.jsx` y `ReporteNovedades.jsx`.
- Mobile: parseo JSX PASS en `app-movil/src/screens/AutoservicioScreen.js`; la pestaña muestra `history.permisos` y `history.documentos` usando `tipo_novedad`, `tipo_documento`, `documento_url` y metadata de soporte.
- El build Vite completo queda identificado como bloqueo ambiental reproducible: el workspace no tiene el ejecutable local `vite` y la prueba con un binario alterno alcanza el cierre PWA pero falla porque el `node_modules` local esta incompleto (`es-abstract/2024/IsArray.js` ausente); la reinstalacion offline no finalizo, no se modifico el lockfile ni se oculto el hallazgo.
- Superficie verificada: solo `nuevo_nomina`; no se modifico `sinkroniq-mobile` ni otro repositorio.
