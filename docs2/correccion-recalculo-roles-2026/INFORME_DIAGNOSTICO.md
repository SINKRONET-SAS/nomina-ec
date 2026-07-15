# Informe diagnostico HRC26 - correccion y recalculo de roles

Generado: 2026-07-15T03:58:00.499Z
Hash de evidencia: 733bb601c4db6ba7584698f4a834515b5faac881568d732dc67caeeadec81e0c

## Resultado por superficie

- HRC26-LAND-001 [LANDING]: confirmado. La promesa publica presenta cierre controlado, respaldo y planes sin afirmar que un borrador sea un comprobante final.
- HRC26-BE-001 [BACKEND]: confirmado. Debe existir un ciclo transaccional de descarte para borradores.
- HRC26-API-001 [BACKEND]: confirmado. La API debe exponer acciones gobernadas por RBAC y usuario fresco.
- HRC26-API-002 [BACKEND]: confirmado. El endpoint heredado de reapertura conserva compatibilidad HTTP, pero no muta roles cerrados.
- HRC26-PWA-001 [PWA]: confirmado. La PWA debe ofrecer una salida visible desde el calculo y cada rol borrador.
- HRC26-PWA-002 [PWA]: confirmado. La etiqueta visual debe usar el campo persistido `estado`.
- HRC26-ATT-001 [BACKEND]: confirmado. La correccion de novedades por mes debe interpretar las fechas laborales con el mismo formato que PostgreSQL.
- HRC26-ATT-002 [PWA_BACKEND]: confirmado. La asistencia manual debe soportar lote CSV y busqueda eficiente de empleados.
- HRC26-MOB-001 [MOBILE]: confirmado. Autoservicio debe ocultar resultados que RRHH aun puede corregir.
- HRC26-DOC-001 [DOCUMENTOS]: confirmado. Un PDF preliminar debe diferenciarse del rol cerrado.
- HRC26-LEGAL-001 [LEGAL_EC_2026]: confirmado. Parametros laborales y tributarios 2026 versionados en el repositorio.
- HRC26-NOREG-001 [NO_REGRESION]: confirmado. Los contratos del sistema deben bloquear regresiones del nuevo ciclo.

## Hallazgos abiertos

- Sin hallazgos abiertos despues de ejecutar HRC26.

## Fuentes oficiales reconfirmadas

- SBU 2026: https://www.trabajo.gob.ec/wp-content/plugins/download-monitor/download.php?force=1&id=4933. Acuerdo ministerial fija USD 482 desde el 1 de enero de 2026.
- Roles, respaldo digital y base mensual: https://www.trabajo.gob.ec/wp-content/uploads/downloads/2024/01/MDT-2023-140-AM-Obligaciones-empleador-y-procedimientos-de-inspeccion-14-11-23-signed.pdf. Admite repositorios digitales, exige respaldo documental y establece 30 dias/240 horas para calculos mensuales descritos.
- Impuesto a la Renta 2026: https://www.sri.gob.ec/o/sri-portlet-biblioteca-alfresco-internet/descargar/58a7f4f6-ab51-48b6-b9ff-a8e97e1a28ef/Tablas%20de%20c%C3%A1lculo%20de%20Impuesto%20a%20la%20Renta.pdf. Tabla 2026 inicia en USD 12.208 y termina con tarifa marginal de 37% desde USD 109.956.
- Aportes IESS: https://iess.gob.ec/es/web/afiliado/servicios-y-prestaciones. 9,45% para afiliado y 11,15% para empleador en relacion de dependencia privada.

## Criterio de cumplimiento

- Los borradores pueden corregirse con trazabilidad; los estados finales permanecen inmutables.
- La edicion opera sobre novedades y datos fuente, no sobre totales tributarios calculados.
- Este diagnostico es un control tecnico de producto y no reemplaza asesoria legal o tributaria.
