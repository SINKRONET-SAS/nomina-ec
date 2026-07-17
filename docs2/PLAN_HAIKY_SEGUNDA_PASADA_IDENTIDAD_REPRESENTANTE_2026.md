# Plan Haiky: segunda pasada de identidad y almacenamiento documental 2026

## Objetivo

Corregir reportes y documentos que muestran al representante legal como no registrado aunque el dato exista en Parametrizacion > Datos de empresa. La segunda pasada reutiliza `configuration_catalogs` (`empresa_operativa`), conserva compatibilidad con `tenants.configuracion`, evita estados paralelos, corrige notas internas que se estaban imprimiendo dentro de contratos y protege el almacenamiento documental.

## Evidencia inicial

- El PDF `acta_entrega_dotacion_1783619649545.pdf` muestra `Representante legal: no registrado` e identificacion vacia.
- La ficha de Datos de empresa contiene `VERONICA JOCELYN SALVADOR LO...` y cedula `1714406954`.
- La pantalla guarda esos campos en `configuration_catalogs.payload` con `catalog_type = 'empresa_operativa'`.
- `equipmentDeliveryActService` solo proyectaba `tenants.configuracion`, por lo que no alcanzaba la fuente usada por la pantalla.

## Alcance

- Backend: resolvedor unico de identidad empresarial, integracion en acta de dotacion, roles, contratos y finiquito, con metadata de la fuente resuelta.
- PDF/documentos: representante, identificacion, cargo, razon social, direccion y logo se resuelven desde la configuracion operativa vigente con fallback legado reversible.
- Contratos: las notas de base legal, revision, SUT/MDT y plantilla preliminar quedan como metadata interna y no se imprimen en el contrato; las referencias se ajustan para no tratar el articulo 56 de la Ley de Comercio Electronico como una regla general de notificacion SUT.
- Documentos huerfanos: listar y eliminar registros de `documentos_legales` sin `empleado_id`, eliminando primero el objeto de almacenamiento trazable.
- Adjuntos de ficha: validar tipo real, tamano maximo y la dimension aplicable antes de guardar contrato o soporte.
- PWA: indicador de identidad documental, limites de adjuntos y limpieza de huerfanos.
- Gobierno: plan, contexto, prompts, AuditLock encadenado al plan RDE26 cerrado, QA, cierre, commit y push a `main`.

## No alcance

- No se modifica el esquema de base de datos.
- No se copian datos de la empresa a otra tabla.
- No se eliminan documentos vinculados a un empleado ni documentos historicos por estado de plantilla.
- No se reabre el plan RDE26; esta es una cadena AuditLock nueva.
- No se reemplaza la responsabilidad del cliente de validar documentos laborales.

## Decisiones tecnicas

1. El registro activo mas reciente de `configuration_catalogs.payload` con `empresa_operativa` es la fuente canonica para documentos nuevos.
2. `tenants.configuracion` y columnas legadas son fallback compatible cuando el catalogo no tenga el dato.
3. El resolvedor es asincrono y tenant-aware; fallas de base de datos se propagan como errores estructurados.
4. Los generadores reciben una proyeccion normalizada sin duplicar reglas de precedencia.
5. Los documentos historicos no se regeneran automaticamente.
6. La eliminacion de huerfanos exige `empleado_id IS NULL` y una clave de almacenamiento trazable; si falta, el proceso se bloquea.
7. Politica inicial: PDF hasta 8 MB y 30 paginas; imagenes hasta 5 MB y 5000 x 5000 pixeles. Backend es la autoridad final y guarda metadatos de tamano/dimensiones.
8. Un contrato emitido para firma no imprime controles editoriales ni reservas de revision. La evidencia legal interna se conserva en metadata y las clausulas deben respetar limites de jornada, recargos, llamamiento, beneficios, terminacion, proteccion de datos y validez probatoria de mensajes electronicos.

## Fases y prompts

| Fase | Entregable | Criterio de salida |
|---|---|---|
| RDE26P2-00 | Gobierno, diagnostico y baseline | Fuente canonica, defecto y requisitos de almacenamiento documentados |
| RDE26P2-01 | Resolvedor de identidad | Catalogo activo, fallback, errores estructurados y pruebas unitarias |
| RDE26P2-02 | Integracion documental, almacenamiento y correccion legal de contratos | PDFs sin notas invalidantes, clausulas alineadas, huerfanos y limites de carga operables y trazables |
| RDE26P2-03 | Exposicion PWA | Parametrizacion, fichas y Documentos exponen controles accionables |
| RDE26P2-04 | QA y cierre | Pruebas, codificacion, AuditLock, commit y push exitosos |

## Compatibilidad y reversion

No hay migracion de estado. La reversion consiste en retirar el resolvedor de los puntos de integracion y conservar la consulta anterior; el catalogo y documentos emitidos permanecen intactos. Los limites se centralizan en una politica sin migracion.

## Validaciones obligatorias

- `node --check` de modulos backend modificados.
- Pruebas de precedencia catalogo/fallback, acta, huerfanos y politica de adjuntos.
- Prueba de contratos: ningun PDF emitido imprime `Base legal y controles de emision`, reservas de plantilla/revision ni la falsa asociacion del articulo 56 con el SUT.
- Suite backend y `npm.cmd run build` en `frontend-web`.
- `npm.cmd run contracts` y `npm.cmd run prisma:validate`.
- Validacion UTF-8 sin BOM y `git diff --check`.
- AuditLock valido y firmado en cada transicion de fase.

## Cierre RDE26P2

- Las emisiones nuevas de contratos ya no imprimen notas internas de revision, plantilla preliminar ni estado SUT/MDT; la evidencia legal queda en metadata auditable.
- La identidad del representante legal se resuelve desde el catalogo operativo activo con fallback legado compatible.
- La PWA expone estado de identidad, limites de adjuntos y limpieza controlada de documentos huerfanos.
- QA ejecutado: 62 suites y 420 tests backend, contratos de sistema, Prisma, build PWA de 1536 modulos, validacion de AuditLock y `git diff --check`.
- Los PDFs historicos no se regeneran automaticamente; deben volver a emitirse para reflejar la correccion.
