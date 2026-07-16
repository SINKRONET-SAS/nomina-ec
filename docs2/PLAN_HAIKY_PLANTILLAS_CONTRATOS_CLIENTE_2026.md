# Plan Haiky - Plantillas de contratos parametrizables por cliente 2026

## Identificación

| Campo | Valor |
|---|---|
| Plan | `HAIKY-PLANTILLAS-CONTRATOS-CLIENTE-2026` |
| Código | `TPC26` |
| Estado | `TPC26-06 cerrada; implementación, QA y gobierno completados` |
| Fecha | `2026-07-16` |
| Producto | SKNOMINA / nomina-ec |
| Fuente normativa de trabajo | `RULES.md` |
| Contexto Codex | `.github/CODEX_CONTEXT.md` |
| AuditLock | `.vscode/AuditLock.json` |

## Fuente del requerimiento

Refactorizar la funcionalidad de plantillas de contratos para que:

- sean parametrizables de forma controlada;
- cada cliente vea y use únicamente las plantillas que necesita;
- se reduzca el almacenamiento innecesario sin eliminar evidencias laborales;
- se mantenga compatibilidad con contratos y empleados existentes;
- la configuración sea visible y operable en frontend;
- las fases queden gobernadas por `AuditLock`, aprobación explícita y trazabilidad Haiky.

## Línea base confirmada

| Hallazgo | Evidencia actual | Riesgo |
|---|---|---|
| Catálogo estático global | Hay 17 archivos JSON en `backend/src/templates/legal/contracts/`; `listContractTemplates()` enumera todos los `.json`. | Todos los clientes reciben un catálogo sobredimensionado y no existe selección por tenant. |
| Persistencia mínima | `empleados.tipo_contrato` almacena una clave de hasta 60 caracteres, con valor heredado `indefinido`. | No se registra qué versión fue elegida ni la activación específica del cliente. |
| API existente | `GET /api/documentos/contrato/plantillas` lista plantillas y `POST /api/documentos/contratos` recibe `tipoContrato` o `templateKey`. | Cambiar el contrato público sin compatibilidad rompería la PWA y consumidores existentes. |
| Generación actual | `templateGenerator.js` carga JSON desde disco, valida secciones y genera PDF con snapshot en metadata. | La parametrización requiere versionar la fuente y congelar el snapshot usado por cada documento. |
| Exposición frontend | `NuevoEmpleado.jsx` consulta el catálogo completo; `contractTemplates.js` contiene alias y normalización local. | Puede aparecer una opción no activa para el cliente o duplicarse la fuente de verdad. |
| Configuración reutilizable | Existe `configuration_catalogs` con `tenant_id`, `scope`, `catalog_type`, `code`, `status`, `payload` y auditoría de creación/aprobación. | Debe comprobarse si sus garantías cubren plantillas o si hace falta una ampliación reversible. |
| Almacenamiento | Los PDFs generados se guardan bajo `documentos/<tenant>/<empleado>/contratos/`; hay documentos locales de prueba y metadata de almacenamiento. | Desactivar una plantilla no autoriza borrar contratos ya emitidos ni sus evidencias. |
| Generación automática | Al crear empleado se intenta generar automáticamente el contrato. | Debe definirse si la generación automática se limita a la plantilla predeterminada activa o se convierte en generación bajo demanda. |

## Objetivo técnico

Construir una única fuente de verdad para el catálogo de plantillas, con selección por tenant, versiones inmutables, parámetros permitidos y validación de uso. El runtime debe resolver la plantilla activa del cliente, conservar compatibilidad con claves antiguas y guardar en cada documento emitido el snapshot de la plantilla y de sus parámetros.

La solución no debe duplicar los JSON completos por cliente. La activación por cliente debe referenciar una plantilla/versionado común y almacenar solo configuración, overrides permitidos y estado. El almacenamiento de documentos emitidos se conserva como evidencia; el ahorro debe provenir de no replicar plantillas ni generar documentos no solicitados, y de una limpieza gobernada de artefactos no legales únicamente cuando exista evidencia de que son descartables.

## Implementación ejecutada

- `TPC26-01`: diagnóstico confirmado de 17 fuentes JSON, consumidores, metadata histórica y almacenamiento local disponible.
- `TPC26-02`: `configuration_catalogs` reutilizado para activación tenant, default, orden, versión y permisos; migración de índices reversible por no modificar datos históricos.
- `TPC26-03`: resolver backend único, aliases compatibles, lista blanca de parámetros, bloqueo de inactivos/desalineados y snapshot con parámetros/correlationId.
- `TPC26-04`: pantalla PWA `/dashboard/configuracion/plantillas-contrato`, navegación, estados de carga/error/vacío/bloqueo y consumo de catálogo activo en empleados/contratos.
- `TPC26-05`: inventario SHA-256 y script de cuarentena reversible; `dry-run` sin candidatos y sin eliminación de evidencia legal.
- `TPC26-06`: gates completas ejecutadas, gobierno cerrado en `AuditLock`, commit y push a `main`.

La medición dinámica de PostgreSQL/S3 no estuvo disponible en el entorno de ejecución. El inventario reproducible quedó limitado al almacenamiento local: 36 archivos y 624.999 bytes; la ausencia de candidatos temporales impidió declarar ahorro artificial.

## Principios no negociables

- `RULES.md` gobierna todas las fases.
- No iniciar una fase posterior sin `AuditLock` válido y aprobación explícita del usuario mediante el prompt de la fase.
- No cambiar endpoints públicos ni payloads sin compatibilidad documentada.
- No eliminar plantillas, contratos emitidos, snapshots ni metadata legal sin inventario, retención y rollback.
- No crear un catálogo frontend paralelo; la PWA consume la disponibilidad resuelta por backend.
- No guardar en base de datos el texto completo de la plantilla por tenant si una referencia versionada es suficiente.
- No permitir HTML, scripts, expresiones arbitrarias ni variables fuera de una lista validada.
- No permitir que una plantilla inactiva se use para nuevas generaciones, pero sí permitir descargar documentos históricos ya emitidos.
- Los documentos generados deben conservar `templateKey`, `templateVersion`, parámetros resueltos, `sourcePath` o identificador de fuente y `correlationId` cuando el flujo lo tenga.
- Las decisiones legales sobre cláusulas, modalidades y vigencia requieren revisión laboral profesional; SKNOMINA no se presenta como asesoría legal.
- Todo cambio de código debe incluir trazabilidad de commit con `phase: TPC26-X task: Y`.

## Arquitectura objetivo propuesta

### 1. Catálogo de fuentes

Mantener una fuente compartida y versionada para las definiciones de contrato. La fase TPC26-01 debe decidir, con evidencia, si se reutiliza `configuration_catalogs` para las activaciones o si se amplía con una estructura específica. La decisión debe evitar un segundo catálogo de plantillas.

Cada registro lógico debe poder expresar como mínimo:

- `templateKey` estable;
- versión inmutable;
- nombre y descripción para frontend;
- tipo contractual homologado;
- estado de disponibilidad de la fuente;
- revisión legal requerida y fecha de revisión;
- variables y parámetros permitidos con tipo, obligatoriedad y valor predeterminado;
- condiciones de aplicación;
- aliases heredados;
- orden y posibilidad de selección como predeterminada.

### 2. Activación por tenant

Cada cliente debe tener una configuración explícita de plantillas disponibles. El estado del tenant debe distinguir al menos `borrador`, `activo`, `inactivo` y `retirado`, sin crear un estado paralelo que contradiga la fuente de verdad. Debe existir una única plantilla predeterminada activa por tenant o una regla clara de fallback controlado.

La activación no debe copiar el JSON completo. Debe referenciar `templateKey` y versión, guardar únicamente parámetros permitidos y registrar quién aprobó el cambio.

### 3. Resolución y compatibilidad

El backend debe resolver en este orden:

1. selección explícita válida enviada por el usuario;
2. plantilla activa asociada al tenant;
3. valor `empleados.tipo_contrato` compatible con aliases heredados;
4. plantilla predeterminada activa;
5. error funcional claro si no existe una opción válida.

La resolución debe devolver una etiqueta humana, versión, estado y advertencias necesarias para que el frontend no muestre claves técnicas como única información.

### 4. Parametrización segura

La plantilla debe admitir únicamente variables y parámetros declarados. La validación debe rechazar campos desconocidos, tipos inválidos, valores fuera de rango y combinaciones legales incompatibles. Los parámetros deben quedar congelados en el snapshot del documento emitido.

No se permitirá que el cliente modifique libremente cláusulas legales desde un editor de texto sin esquema, revisión y versionado. La primera entrega debe priorizar parámetros controlados: datos de empresa, centro de trabajo, jornada, modalidad, periodo de prueba, forma de pago, vigencia, texto descriptivo de actividad y cláusulas opcionales expresamente aprobadas.

### 5. Almacenamiento y retención

- Las definiciones comunes no se replican por tenant.
- La generación automática se limita a la plantilla activa predeterminada o se cambia a bajo demanda, según decisión de TPC26-01.
- Los PDFs emitidos y firmados se consideran evidencia y no se eliminan al desactivar una plantilla.
- Los archivos temporales, duplicados de pruebas y artefactos no referenciados requieren inventario y script reversible antes de eliminarse.
- El ahorro se medirá separando: tamaño de fuentes, cantidad de PDFs generados, duplicados, documentos históricos y objetos huérfanos.
- Toda operación de limpieza debe tener modo `dry-run`, reporte, correlación, alcance por tenant y rollback documental.

## Fases y entregables

| Fase | Prioridad | Objetivo | Estado | Entregables |
|---|---:|---|---|---|
| TPC26-00 | P0 | Baseline y gobierno documental | completada | Plan, contexto, prompts, AuditLock firmado y matriz de alcance. |
| TPC26-01 | P0 | Diagnóstico y decisión de arquitectura | completada | Inventario y decisión `configuration_catalogs` documentados. |
| TPC26-02 | P0 | Modelo de activación por cliente y migración reversible | completada | Migración de índices, activaciones, permisos, default y compatibilidad. |
| TPC26-03 | P0 | Runtime parametrizable y versionado | completada | Resolver, esquema de parámetros, validación, snapshot y pruebas backend. |
| TPC26-04 | P1 | Frontend de configuración y operación | completada | Pantalla PWA, navegación, selección activa y bloqueos accionables. |
| TPC26-05 | P1 | Migración de documentos y optimización de almacenamiento | completada | Inventario SHA-256 y limpieza reversible `dry-run`, sin borrar evidencias. |
| TPC26-06 | P0 | QA, seguridad, legal y cierre | completada | 58 suites/406 tests, contratos, Prisma, build PWA, UTF-8, AuditLock, commit y push. |

## Criterios de aceptación

- El cliente puede activar, desactivar y ordenar únicamente plantillas permitidas por el catálogo central.
- La PWA no lista plantillas inactivas salvo una advertencia explícita para conservar una selección histórica del empleado.
- Un empleado existente conserva su clave y puede seguir generando su contrato mientras la plantilla/versionado esté soportado; si fue retirado, el sistema ofrece una migración controlada y no cambia el documento histórico.
- La generación rechaza una plantilla no activa, una versión no disponible o parámetros no permitidos con mensaje en español, código funcional y `correlationId`.
- Cada PDF nuevo conserva snapshot de fuente, versión, parámetros y empleado/tenant que lo originaron.
- La generación automática no produce documentos para plantillas que el cliente no activó.
- Los contratos históricos siguen descargables aunque la plantilla se desactive.
- La limpieza de almacenamiento no elimina documentos legales, firmados o referenciados.
- No se rompe `GET /api/documentos/contrato/plantillas`, `POST /api/documentos/contratos` ni la ficha de empleado sin una transición compatible.
- El avance es visible en frontend y las pantallas de configuración muestran bloqueos externos, revisión legal o siguiente acción.

## Gates por fase

### TPC26-00

- Lectura completa de `RULES.md`.
- Inventario confirmado de las 17 fuentes JSON, endpoints, campos de empleado, UI y almacenamiento.
- Artefactos documentales en UTF-8 sin BOM.
- `.vscode/AuditLock.json` contiene `phaseCompleted`, `filesModified`, `validationChecks` y `signature`.

### TPC26-01 a TPC26-05

- `git status --short` y alcance explícito.
- Tests focalizados de los servicios/controladores modificados.
- `node --check` en scripts y servicios JS afectados.
- `npm.cmd run contracts` o el gate contractual vigente.
- `npx.cmd prisma validate` cuando exista migración o cambio de esquema.
- Build de `frontend-web` cuando se modifique la PWA.
- Validación de UTF-8 sin BOM y ausencia de mojibake en archivos modificados.
- `git diff --check`.
- AuditLock firmado antes de pasar a la siguiente fase.

### TPC26-06

- Suite backend focalizada y suite completa disponible.
- Build PWA y contratos del sistema.
- Prueba de permisos por tenant y regresión de aliases.
- Prueba de generación, descarga histórica y bloqueo de plantilla inactiva.
- Medición de almacenamiento antes/después.
- Rollback documentado y validado en modo `dry-run`.
- Commit con `phase: TPC26-06 task: qa-release` y push solo con autorización.

## Riesgos y controles

| Riesgo | Control |
|---|---|
| Retirar una plantilla usada por empleados | Mantener aliases, detectar referencias y bloquear eliminación física mientras existan documentos o empleados dependientes. |
| Duplicar catálogo entre frontend y backend | Resolver catálogo únicamente desde API; compartir normalización solo como compatibilidad técnica. |
| Perder evidencia legal al ahorrar almacenamiento | Separar fuentes, temporales y documentos emitidos; no borrar documentos legales sin política de retención y evidencia. |
| Cambiar una plantilla y alterar contratos ya emitidos | Versiones inmutables y snapshot en metadata. |
| Parámetros inseguros o cláusulas arbitrarias | Esquema declarado, lista blanca, tipos, límites, revisión legal y rechazo de campos desconocidos. |
| Romper integraciones existentes | Mantener payloads y aliases, agregar campos opcionales y usar transición documentada. |
| Generar contratos sin configuración | Estado de configuración visible en PWA, fallback controlado y error accionable. |

## Rollback

Toda migración debe incluir:

1. exportación de registros afectados por tenant y plantilla;
2. script de reversión que restaure estado, versión, default y aliases;
3. prohibición de borrar documentos emitidos como parte del rollback;
4. reporte `dry-run` antes de ejecutar cualquier eliminación de objetos;
5. validación de que la aplicación puede seguir resolviendo la clave heredada.

## Trazabilidad

- Fase actual: `TPC26-06` cerrada.
- Siguiente acción: operación y revisión laboral profesional antes de activar modelos en cada cliente.
- Prompts: `.github/prompts/TPC26-00` a `.github/prompts/TPC26-06`.
- Commit de cierre: `phase: TPC26-06 task: qa-release`.
- Cada cambio posterior requiere abrir un nuevo plan o fase gobernada; no se reabre silenciosamente este AuditLock.
- Los planes anteriores se conservan como historial; no se elimina ni reescribe el precedente OAP26.
