# Plan Haiky: reportes, documentos y ciclo de vida del empleado

## 1. Identificación

- **Plan:** `HAIKY-REPORTES-DOCUMENTOS-EMPLEADOS-2026`
- **Código:** `RDE26`
- **Fecha:** `2026-07-16`
- **Fuente normativa de ejecución:** `RULES.md`
- **Contexto operativo:** `.github/CODEX_CONTEXT.md`
- **Control de fases:** `.vscode/AuditLock.json`
- **Rama y entrega:** `main`, con commit trazable y push al remoto configurado.

## 2. Necesidad

La operación requiere reportes y documentos con identidad visual de la empresa, salidas consolidadas y detalladas, columnas elegibles y alternativas transpuestas; reportes contables agrupados por cuenta o desglosados; y un ciclo documental coherente cuando un empleado se elimina. En Contratos se necesita consultar todos los registros con búsqueda, filtros, desplazamiento y descarga clara de contratos firmados. El catálogo de tipos de contrato aceptados para Ecuador debe vivir en Ayuda, donde sirve como referencia operativa sin ocupar la pantalla transaccional.

## 3. Decisiones de compatibilidad

1. Se mantienen las rutas públicas existentes y sus nombres de respuesta; las nuevas opciones se agregan dentro de `filters` o como parámetros opcionales.
2. Las columnas se seleccionan desde un catálogo de claves permitidas por reporte. Nunca se ejecutan nombres de columna enviados por el cliente.
3. El reporte contable conserva el detalle actual como valor predeterminado y agrega `accountingMode=consolidated` para agrupar por período, asiento y cuenta.
4. Los documentos firmados continúan descargándose mediante la ruta protegida existente; la PWA los identifica y ofrece una acción diferenciada.
5. La eliminación de empleado sigue siendo lógica. Antes de marcarlo inactivo se eliminan los documentos legales vinculados y sus objetos de almacenamiento; los roles cerrados/pagados continúan bloqueando la operación.
6. Los tipos de contrato Ecuador se consultan desde la fuente existente y se muestran en Ayuda; no se crea un catálogo paralelo.
7. Los PDFs generados que aún no muestran logo reutilizan la configuración `tenant.configuracion.logoBase64`, sin nueva fuente de almacenamiento.

## 4. Alcance

### Incluido

- Catálogo y aplicación segura de columnas personalizadas en exportaciones de nómina y consolidado anual.
- Vista contable detallada o consolidada por cuenta, con auditoría de filtros y modo elegido.
- Validación de logo en PDFs pendientes y conservación de identidad de empresa.
- Listado de contratos generados y firmados con búsqueda, filtro de tipo/estado y contenedor desplazable.
- Descarga explícita de contratos firmados desde Contratos.
- Depuración de documentos de un empleado eliminado, con auditoría y errores explícitos.
- Catálogo Ecuador reubicado de Contratos a Ayuda.
- Pruebas, build, validación UTF-8, cierre de AuditLock y trazabilidad Git.

### Fuera de alcance

- Cambiar contratos históricos o re-renderizar PDFs ya emitidos.
- Borrar empleados con roles cerrados/pagados o eliminar evidencia de procesos laborales cerrados.
- Cambiar el catálogo legal ecuatoriano o afirmar registro automático ante SUT, IESS, MDT o SRI.
- Rediseñar los reportes oficiales SRI/IESS más allá de la identidad visual y controles de compatibilidad.

## 5. Fases y criterios de salida

| Fase | Objetivo | Entregables | Salida |
|---|---|---|---|
| `RDE26-00` | Baseline y gobierno | Plan, contexto, prompts, AuditLock y diagnóstico | Fuentes y contratos de compatibilidad identificados |
| `RDE26-01` | Reportes configurables | Catálogo de columnas, filtros y modo de presentación | XLSX/CSV respeta lista blanca y conserva filtros |
| `RDE26-02` | PDF y contabilidad | Logo en PDF pendiente y consolidación por cuenta | Detalle/consolidado auditable con `correlationId` |
| `RDE26-03` | Documentos y ayuda | Búsqueda, filtro, scroll, descarga de firmados y catálogo en Ayuda | Contratos operables desde una sola pantalla |
| `RDE26-04` | Ciclo de vida | Depuración documental al eliminar empleado | No quedan documentos activos ni objetos vinculados |
| `RDE26-05` | QA y cierre | Suite, build, revisión de seguridad, cierre de artefactos y Git | AuditLock cerrado y commit/push exitosos |

## 6. Validaciones obligatorias

- `npm run contracts`
- `npm run prisma:validate`
- `npm test -- --runInBand` dentro de `backend`
- `npm run build` dentro de `frontend-web`
- `node --check` sobre JavaScript backend nuevo/modificado
- revisión de rutas protegidas, alcance `tenant_id`, errores con `code`, `statusCode`, `correlationId` y `userId`
- validación UTF-8 sin BOM en archivos `.js`, `.md` y `.json` modificados
- `git diff --check`, estado limpio después del commit y confirmación del remoto tras el push

## 7. Riesgos y controles

- **Evidencia legal:** no se modifica ni se borra un documento de un empleado con nómina cerrada/pagada; toda depuración registra cantidad, claves y usuario.
- **Inyección de columnas:** el servidor resuelve las columnas contra un catálogo fijo.
- **Pérdida de archivos:** el registro de documento se elimina solo después de borrar el objeto; si el almacenamiento falla, la operación se detiene y devuelve error estructurado.
- **Regresión de endpoints:** los campos anteriores siguen funcionando si el cliente no envía las nuevas opciones.
- **Logo inválido:** los generadores omiten solo un logo ausente o inválido ya validado por configuración; no se interrumpe el reporte por la ausencia de imagen.

## 8. Cierre

El plan se considera cerrado únicamente cuando `RDE26-05` figure como `closed` en `AuditLock.json`, el contexto refleje el resultado real, los prompts estén marcados como ejecutados, las validaciones pasen y el commit de fase se encuentre en `origin/main`.
