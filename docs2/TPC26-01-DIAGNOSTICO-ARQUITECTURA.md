# TPC26-01 - Diagnóstico y decisión de arquitectura

Fecha de ejecución: 2026-07-16
Plan: `HAIKY-PLANTILLAS-CONTRATOS-CLIENTE-2026`

## Hallazgos confirmados

- La fuente estática contiene 17 definiciones JSON en `backend/src/templates/legal/contracts/`, con un tamaño total de 71.775 bytes.
- 14 definiciones tienen versión `2026.07`, 2 tienen `2026.06` y 1 tiene `2026.07.03`; no existe un registro de activación por cliente.
- Las definiciones tienen entre 5 y 17 secciones y entre 8 y 24 variables interpoladas. La plantilla `contrato_obra_servicio_giro_negocio` es la única marcada como `signature_ready` y declara 17 campos de firma.
- `templateGenerator.listContractTemplates()` enumera todos los archivos y `loadContractTemplate()` resuelve aliases localmente; ambos ignoran el tenant y el estado de disponibilidad.
- `documentos_legales.metadata` ya conserva `templateKey`, versión, fuente, tipo, estado legal, almacenamiento y snapshot del contexto. Esto permite desactivar una fuente sin impedir la descarga histórica.
- `empleados.tipo_contrato` es texto compatible con claves antiguas y el alta de empleado intenta generar automáticamente un contrato.
- La PWA consume el catálogo global desde `/documentos/contrato/plantillas`; `NuevoEmpleado.jsx` y `ContratosGenerados.jsx` no reciben disponibilidad por cliente.
- `configuration_catalogs` ya contiene alcance tenant, código, estado, vigencia, payload y aprobación, con índice único por tenant, tipo y código. Crear una tabla paralela duplicaría gobierno y almacenamiento.

## Medición de almacenamiento disponible

En el checkout local existe `backend/storage/local-files` con 36 archivos y 624.999 bytes: 13 PDF (495.760 bytes), 18 JSON de metadata (3.971 bytes), 2 XLSX (50.381 bytes), 1 CSV (3.295 bytes) y 2 XML (71.592 bytes). La medición no identifica por sí sola documentos legales eliminables.

No se pudo consultar PostgreSQL ni un bucket S3 desde este entorno: `psql` no está disponible y no se expusieron credenciales de base de datos o almacenamiento. Por tanto, no se inventan conteos de empleados, tenants, metadata histórica, duplicados u objetos huérfanos. TPC26-05 incluirá un inventario ejecutable y `dry-run` para completar esas cifras en un entorno autorizado.

## Decisión arquitectónica

1. Reutilizar `configuration_catalogs` con `catalog_type = plantilla_contrato`.
2. Guardar por tenant únicamente activación, orden, default, versión de referencia, aliases y lista blanca de parámetros; nunca copiar el JSON completo.
3. Mantener las 17 fuentes compartidas en el backend mientras exista compatibilidad. Si un tenant aún no tiene configuración, el resolver devuelve el comportamiento legado: todas las plantillas activas y `contrato_indefinido_general` como default.
4. Exponer dos lecturas: catálogo operativo activo para generación y catálogo administrativo completo para parametrización. La respuesta conserva `templateKey`, `tipoContrato` y los campos existentes.
5. Resolver alias y activación en un único servicio backend. La PWA solo consume el resultado resuelto.
6. Parametrizar únicamente rutas declaradas por una lista blanca, con tipo, longitud, obligatoriedad y revisión legal. El documento guarda los valores usados en su snapshot.
7. La generación automática se mantiene para el alta de empleado, pero usa el resolver por tenant y su default; la generación manual exige una plantilla activa. La desactivación no afecta documentos históricos.

## Matriz de compatibilidad

| Consumidor | Contrato actual | Decisión TPC26 |
|---|---|---|
| Alta de empleado | `tipo_contrato` y generación automática | Se conserva; se valida contra activación tenant y default legado |
| Generación manual | `tipoContrato` o `templateKey` | Ambos siguen aceptados; `templateKey` tiene prioridad |
| Listado de plantillas | `templates[]` global | Se mantiene para activos; `scope=all` agrega administración |
| Documentos históricos | `metadata` y URL de descarga | No depende de plantilla activa ni de fuente vigente |
| Aliases frontend/backend | `indefinido`, `prueba`, etc. | Se centralizan en backend y se conserva normalización frontend como compatibilidad |
| Almacenamiento | PDF por documento y metadata | No se eliminan evidencias; solo se auditan temporales y huérfanos |

## Dependencias y límites de modificación

Las fases posteriores pueden modificar: servicio de catálogo de contratos, controlador/rutas de documentos, generador y sus pruebas, migración Prisma, pantalla de parametrización de plantillas, selección en empleados/contratos y scripts de inventario. No se debe cambiar el formato histórico de `documentos_legales`, eliminar JSON fuente ni borrar documentos emitidos.

## Criterio de cierre TPC26-01

Diagnóstico y decisión confirmados. La medición dinámica de PostgreSQL/S3 queda como evidencia pendiente de ambiente y se implementará como comando `dry-run`, sin bloquear la arquitectura ni autorizar eliminación.
