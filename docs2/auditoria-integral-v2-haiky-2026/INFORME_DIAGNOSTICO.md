# Informe diagnostico integral V2 - SKNOMINA Ecuador 2026

Generado: 2026-07-15T03:58:00.637Z
Hash evidencia: e6fa0d425d40b17c862e94360c2a3b8ea26db664e428fa288867201e10b2dddc

## Resumen ejecutivo

- La auditoria cubre LANDING, PWA, BACKEND y MOBILE con lectura estatica, gates de contrato y fuentes oficiales 2026.
- Facturacion electronica se mantiene como integracion: nombre comercial SINKRONET FACTURADOR; API tecnica provista por SINKRONIQ-MOBILE.
- Establecimientos IESS se tratan como capacidad parametrizable y monetizable por plan, no como dato hardcodeado.
- Los precios publicos deben mostrar mensualidad, contado anual e IVA 15% de forma clara; la TNA es un insumo de calculo, no un texto promocional aislado.
- El motor de nomina ahora deja integridad de totales y bloquea descuadres entre ingresos, deducciones y neto.

## Fuentes vigentes 2026

- SRI facturacion electronica: https://www.sri.gob.ec/facturacion-electronica (2026-07-14). SRI publica documentos electronicos, ambientes pruebas/produccion y ficha tecnica off-line version 2.33 actualizada a julio 2026.
- Proteccion de datos personales Ecuador: https://www.telecomunicaciones.gob.ec/wp-content/uploads/2021/06/Ley-Organica-de-Datos-Personales.pdf (2026-07-14). Ley Organica de Proteccion de Datos Personales publicada en Registro Oficial No. 459 del 26 de mayo de 2021.
- Ministerio del Trabajo Ecuador: https://salarios.trabajo.gob.ec/ (2026-07-14). Portal oficial de salarios y base legal del Ministerio del Trabajo; parametros SBU 2026 permanecen en configuracion legal del repo.

## Estado por superficie

- landing: confirmado. La landing existe y las rutas estan diferidas para reducir bundle inicial.
- pwa: confirmado. Planes publicos separan mensualidad, contado anual e IVA; establecimientos IESS son capacidad de plan.
- backend: confirmado. Motor de nomina registra integridad de totales; planes exponen establecimientos IESS parametrizables.
- mobile: confirmado. Revision estatica: mobile mantiene cliente API y rutas principales.
- facturacionElectronica: confirmado. Nombre comercial: SINKRONET FACTURADOR. Arquitectura: consumo API del backend SINKRONIQ-MOBILE, sin clonar XML/firma en SKNOMINA.
- proteccionDatos: confirmado. Existen consentimiento, exportacion y aviso de cookies; requiere revision legal final de textos publicos y retencion.

## Evidencia visual

- Pendiente: Playwright no esta instalado en el workspace ni en runtime bundled; se deja como gate manual para no usar screenshots antiguos como evidencia actual.

## Hallazgos automatizados

- Sin hallazgos automatizados abiertos en los patrones V2.

## Candidatos a eliminacion

- Prompts y reportes de auditorias antiguas: archivar_no_eliminar. Son historial de cumplimiento Haiky/AuditLock; eliminar romperia trazabilidad.
- Señales mock en tests: conservar. Pertenecen a pruebas y no son deuda productiva.
- PaymentResult mock/pending query: revisar_renombrar. Esta controlado y no activa planes; conviene renombrar el query param en una fase futura para reducir ruido auditor.
- Helpers inline de descarga Blob: eliminado_en_v2. Se consolidaron en frontend-web/src/utils/downloadBlob.js.

## No regresion

- No se propone desplegar XML IESS/SAE oficial sin guia publica validada.
- No se duplican capacidades fiscales de SINKRONET FACTURADOR dentro de SKNOMINA.
- No se elimina historial Haiky ni prompts anteriores; se versiona la auditoria V2.
- Los cambios runtime son acotados: descarga Blob compartida, lazy routes, textos de precios y guard de integridad de nomina.

## Seguimiento AIV2-07 - asistencia y nomina

- Hallazgo reconfirmado: el reporte llamaba `dias_trabajados` al conteo de fechas con marcacion y unia marcaciones con novedades antes de agregarlas, con riesgo de multiplicar minutos y conteos.
- Correccion: el reporte expone `dias_con_marcacion` y `faltas_aprobadas`, agregados por separado. Cero marcaciones no crea una falta ni bloquea el rol.
- Hallazgo reconfirmado: la consulta del motor solo incluia empleados ingresados hasta el primer dia del mes, aunque el calculo admitia prorrateo.
- Correccion: seleccion hasta fin de mes y prorrateo 30/30 para todos los meses; una falta aprobada conserva valor diario `sueldo / 30`.
- Parametrizacion: la ficha incorpora `controla_asistencia`; desactivarlo excluye app y cargas globales, sin convertir configuracion GPS/jornada en bloqueo de nomina.
- Operacion: asistencia manual diaria, mensual o por rango, para un empleado o todos, con periodo abierto, anti duplicado, transaccion, auditoria y zona horaria Ecuador.
- Reporte laboral: XLSX maestro vertical, una fila por empleado, sin cuenta bancaria y con auditoria de finalidad LOPDP.
- Validacion: 55 suites y 347 pruebas backend, contrato unico, Prisma, mobile y build PWA sin regresiones.
