# Plan Haiky HDG26 - Documentos generados regenerables

## Proposito

Permitir que RRHH elimine de forma controlada contratos y actas generadas cuando el PDF tenga un error de formato, para volver a generarlo con la plantilla o los datos correctos. La eliminacion retira el objeto de almacenamiento, el registro documental y, en actas de dotacion, el registro operativo que origino el PDF.

## Alcance

- Contratos generados (`contrato`) sin firma.
- Actas de finiquito generadas (`acta_finiquito`) sin firma.
- Actas de entrega de dotacion generadas (`acta_entrega_dotacion`) y su registro operativo asociado.
- Accion visible de eliminacion en las tres pantallas de documentos, con confirmacion y mensajes de resultado.
- Endpoint protegido por rol `owner`/`admin_rrhh`, modulo `documentos` y usuario fresco.
- Validacion estricta de tenant, tipo generado, estado no firmado y clave de almacenamiento trazable.
- Auditoria de actor, tenant, correlacion, documento, objeto eliminado y relacion operativa afectada.

## Fuera de alcance

- Eliminacion de contratos o actas firmadas o adjuntas manualmente.
- Eliminacion de documentos de nomina, comprobantes regulatorios, reportes o archivos bancarios.
- Borrado fisico de expedientes de empleados.
- Cambios en `C:\proyectos web\sinkroniq-mobile`.

## Reglas de seguridad y consistencia

1. Solo se eliminan los tipos `contrato`, `acta_finiquito` y `acta_entrega_dotacion`.
2. Un documento con `firmado = true` se rechaza con respuesta funcional y no se toca el almacenamiento.
3. Sin `storageKey` trazable, la operacion se rechaza para evitar archivos huerfanos.
4. En actas de dotacion, un registro marcado como devuelto no se elimina; si sigue abierto, se elimina junto con su documento para permitir regenerar la entrega.
5. Todas las consultas quedan limitadas por `tenant_id` y se ejecutan con bloqueo transaccional.
6. Las respuestas actuales de generacion y descarga conservan sus campos; solo se agrega la ruta de eliminacion.

## Fases y gates

| Fase | Entrega | Gate |
|---|---|---|
| HDG26-00 | Gobierno, baseline y cadena AuditLock | Plan, contexto, prompts y lock encadenado validos |
| HDG26-01 | Diagnostico de persistencia, storage, rutas y UI | Evidencia de tipos, relaciones y restricciones |
| HDG26-02 | Servicio y endpoint de eliminacion segura | Pruebas de autorizacion, tenant, firmado, storage y acta relacionada |
| HDG26-03 | Acciones frontend de eliminacion y regeneracion | Contratos, finiquitos y actas muestran accion solo cuando corresponde |
| HDG26-04 | QA, cierre, commit y push | Pruebas verdes, lock cerrado y `main` actualizado |

## Criterios de aceptacion

1. Un contrato generado no firmado puede eliminarse desde Contratos y luego volver a generarse.
2. Un acta de finiquito generada no firmada puede eliminarse desde Actas de Finiquito.
3. Un acta de entrega no firmada y no devuelta puede eliminarse desde Entrega de dotacion y volver a generarse.
4. Los documentos firmados, adjuntos o actas devueltas no se eliminan.
5. La eliminacion del PDF y de la fila de base de datos es trazable y respeta el tenant.
6. Las pantallas actualizan su listado sin recarga manual y muestran errores funcionales.
7. Pruebas backend, contratos de rutas, Prisma, build frontend, UTF-8 y regresion de anticipos pasan.

## Entrega

Commit requerido: `phase: HDG26-04 task: 4.1 - habilitar regeneracion segura de documentos generados`.

## Cierre HDG26

Todas las fases fueron ejecutadas y cerradas con resultado PASS:

| Fase | Estado | Evidencia |
|---|---|---|
| HDG26-00 | completed-pass | Plan, contexto, prompts y AuditLock desplegados. |
| HDG26-01 | completed-pass | Persistencia, storage, rutas, relaciones y restricciones verificadas. |
| HDG26-02 | completed-pass | Servicio transaccional, endpoint protegido, auditoria y pruebas de eliminacion segura. |
| HDG26-03 | completed-pass | Acciones de eliminacion visibles en las tres pantallas de documentos, con confirmacion y refresco. |
| HDG26-04 | completed-pass | 64 suites / 429 pruebas backend, Prisma, contratos, build frontend y diff check verdes. |

El `AuditLock` queda cerrado en HDG26-04. La publicacion se realiza en `main` despues de esta validacion.
