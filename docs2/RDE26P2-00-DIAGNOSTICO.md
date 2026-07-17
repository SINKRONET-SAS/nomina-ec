# RDE26P2-00: diagnostico de segunda pasada

## Hallazgo de identidad

La configuracion mostrada por la PWA no vive necesariamente en `tenants.configuracion`. Datos de empresa crea o actualiza `configuration_catalogs` con `catalog_type = 'empresa_operativa'` y un payload camelCase. El acta de dotacion seleccionaba unicamente `t.configuracion`, por eso emitia el fallback aunque la ficha estuviera completa.

## Superficies revisadas

- `equipmentDeliveryActService`: defecto reproducido; consulta de tenant sin lectura del catalogo operativo.
- `payrollRolePdfService`: firma basada en la configuracion incluida en la fila de nomina.
- `templateGenerator`: contrato ya consultaba el catalogo solo en el camino de firma; finiquito no compartia el mismo resolvedor.
- `sriFormulario107Service` y `payrollReportService`: cabeceras consumen configuracion de tenant; se conservan contratos publicos.
- `Parametrizacion.jsx`: fuente visible de configuracion y punto de supervision.

## Requisito adicional de almacenamiento

`documentos_legales.empleado_id` es opcional y no existe una operacion PWA para inspeccionar o eliminar registros huerfanos. La segunda pasada agrega limpieza tenant-aware que solo actua sobre documentos sin empleado vinculado y con `metadata.storageKey` o clave local derivable. Los adjuntos se validan en cliente y servidor: PDF hasta 8 MB y 30 paginas; imagenes hasta 5 MB y 5000 x 5000 pixeles.

## Hallazgo legal en contratos

La plantilla por obra o servicio contenia un bloque imprimible titulado `Base legal y controles de emision`, seguido de notas de modelo, revision legal y registro SUT/MDT. Ese bloque es control interno y, al aparecer dentro del instrumento que se pretende firmar, puede hacer que el PDF parezca preliminar o condicionado. Adicionalmente, la referencia a los articulos 52 y 56 de la Ley de Comercio Electronico no debe presentarse como una habilitacion general de notificaciones SUT: el articulo 52 trata el valor probatorio de mensajes de datos y el articulo 56 se refiere a notificaciones en procedimientos judiciales.

La correccion aprobada conserva la base legal en metadata auditable, elimina esas notas del PDF emitido y ajusta el texto sobre comunicaciones electronicas a autenticidad, integridad, trazabilidad, conservacion y valoracion conforme a la ley. La inscripcion o tramite SUT/MDT queda como gestion externa, no como hecho acreditado por la generacion del archivo.

## Riesgo

Consultas especificas por generador producen divergencias de precedencia. La resolucion y la politica de almacenamiento deben quedar centralizadas.

## Caso de aceptacion

Con catalogo activo que contenga `representanteLegal = 'VERONICA JOCELYN SALVADOR LOZA'` y `representanteLegalIdentificacion = '1714406954'`, el PDF de acta debe mostrar ambos valores en empleador y firma, y la auditoria debe registrar `configuration_catalogs.empresa_operativa`.
