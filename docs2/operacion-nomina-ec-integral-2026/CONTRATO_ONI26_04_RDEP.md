# Contrato ONI26-04 - RDEP XSD XML

## Objetivo

Definir la base tecnica para generar el Anexo de Retenciones en la Fuente bajo Relacion de Dependencia (RDEP) en XML, con versionado de fuentes y validacion previa al uso productivo.

## Fuentes recibidas

- `backend/src/config/rdep/Esquema_RDEP_2023.xsd`, SHA256 `9067640f71c4c14549c5376e0f5c357d01f69189b24346ff70408adbb5c68046`.
- `C:/Users/proam/Downloads/NAC-DGERCGC24-00000037.pdf`, SHA256 `93fffda378b3814fd57e0a9b1fa138d45a72593ec1002ab0ccbcf6a2335b94f9`.
- `C:/Users/proam/Downloads/Catalogo vigente para el ejercicio fiscal 2024 (1).xls`, SHA256 `4ecdd39ad5d4e57f024919764b6faab18fd9489e0507c308c47af11fc1b70571`.
- `C:/Users/proam/Downloads/Formulario_107 - Formato 2023 (2).xls`, SHA256 `9a24edd1956ae7003f79db78a410ab3b8b9f439c3c03a28d616715afff34c12b`.

## Contrato funcional

- El reporte correcto para nomina es RDEP, no ATS.
- El generador debe emitir raiz `<rdep>` y respetar la secuencia del XSD versionado.
- El XML productivo debe generarse solo con datos del tenant, sin datos demo mezclados.
- La validacion contra XSD es obligatoria antes de descarga o envio productivo.
- La conciliacion con ficha tecnica y catalogo vigente del SRI es obligatoria por ejercicio fiscal.
- Todo bloqueo normativo debe quedar visible para OWNER/SUPERADMIN sin mensajes tecnicos crudos.

## Datos DEMO

Se incluye `backend/src/config/rdep/rdep-demo-2023.xml` con identificadores ficticios y montos cero para pruebas estructurales. No debe usarse en capturas publicas como evidencia de cumplimiento tributario.

## Bloqueos

- El XSD adjunto corresponde a 2023, mientras el catalogo recibido declara ejercicio fiscal 2024.
- Se requiere confirmar fuente oficial vigente del SRI para el ejercicio fiscal objetivo antes de release productivo.
- El repositorio no tiene todavia un validador XSD local versionado; hasta incorporarlo, el gate queda documentado como bloqueo externo.
