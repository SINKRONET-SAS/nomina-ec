# Validacion legal/contable IESS Ecuador 2026

Estado: bloqueado para aprobacion productiva
Fecha: 2026-06-14
Plan: HAIKY-PRODUCTIZACION-NOMINA-EC-DOCUMENTO-NOMINA-2026
Codigo: PNE26-IESS-VALIDACION

## Alcance

Esta revision valida si Nomina-Ec puede tratar como oficiales los aportes IESS usados por el motor de nomina para trabajadores bajo relacion de dependencia del sector privado en Ecuador 2026.

Valores tecnicos actualmente parametrizados:

| Concepto | Valor tecnico | Estado |
| --- | ---: | --- |
| Aporte IESS personal | 9.45% | pendiente_validacion_oficial |
| Aporte IESS patronal | 11.15% | pendiente_validacion_oficial |
| Total referencial | 20.60% | no aprobado para produccion |

## Fuentes oficiales consultadas

| Fuente | URL | Evidencia obtenida | Resultado |
| --- | --- | --- | --- |
| Portal institucional IESS | `https://www.iess.gob.ec/` | Enlace institucional a Normativa y servicios para empleadores. | Fuente base oficial, insuficiente para confirmar tasas. |
| Normativa IESS | `https://www.iess.gob.ec/normativa/` | Enlaces a Constitucion, Ley de Seguridad Social, resoluciones por periodo, actas y resoluciones administrativas. | Indica repositorios oficiales consultables, sin ficha directa de tasas en la vista revisada. |
| Consulta publica de resoluciones IESS | `https://app.iess.gob.ec/iess-gestion-resolucion-publico-web/` | Consulta por periodo, numero, status, materia, palabra clave y fecha. Fecha de actualizacion visible: 9/6/2026. | No se encontro en la vista inicial una resolucion directa que confirme 9.45% y 11.15% como tasas vigentes 2026 para este alcance. |

## Resultado legal/contable

No se aprueba el uso productivo de las tasas IESS 9.45% personal y 11.15% patronal como parametros oficiales 2026. La evidencia consultada confirma rutas oficiales de normativa y resoluciones, pero no aporta por si sola el documento normativo especifico, vigente y trazable que permita levantar el bloqueo.

La conclusion contable es conservar los valores como referenciales de configuracion tecnica, no como parametro legal certificado. Para produccion se requiere validacion documental y aprobacion profesional.

## Evidencia requerida para aprobar

Para cambiar `sourceStatus` a `validado_oficial`, el responsable legal/contable debe adjuntar o registrar:

1. Documento oficial IESS, resolucion, ficha institucional o norma vigente que detalle las tasas aplicables.
2. URL oficial o archivo custodiado con hash, fecha de descarga y responsable de carga.
3. Vigencia temporal, alcance y regimen: trabajador bajo relacion de dependencia, empleador privado, Ecuador 2026.
4. Desglose de aportes personal, patronal, fondos o componentes si corresponde.
5. Criterio contable de base imponible y redondeo.
6. Firma o aprobacion de contador y, si aplica, abogado laboral.

## Impacto en el sistema

El backend mantiene el bloqueo de seguridad mediante `legalParameterService`: si el ambiente es productivo o `REQUIRE_VALIDATED_LEGAL_PARAMETERS=true`, los calculos legales deben fallar con `LEGAL_PARAMETERS_NOT_VALIDATED` mientras los parametros sigan en `pendiente_validacion_oficial`.

No se debe cerrar nomina, generar SAE productivo ni emitir roles oficiales usando estas tasas hasta completar la evidencia requerida.

## Decision HAIKY

| Gate | Estado | Decision |
| --- | --- | --- |
| Fuente oficial IESS localizada | BLOCKED | Portal y repositorio oficial consultados, sin documento especifico de tasas localizado. |
| Validacion contable interna | BLOCKED | Falta aprobacion firmada de contador responsable. |
| Uso tecnico en entorno local | ALLOWED_WITH_WARNING | Permitido solo como referencia para desarrollo y pruebas no productivas. |
| Uso productivo | BLOCKED | Mantener bloqueo hasta `validado_oficial`. |
