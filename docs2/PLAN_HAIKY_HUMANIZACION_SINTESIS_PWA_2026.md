# PLAN HAIKY HUMANIZACION SINTESIS PWA 2026

## Identificacion

- Codigo: HU26
- Sistema: SKNOMINA / nomina-ec
- Fecha: 2026-07-09
- Fuente: "Humanizar y sintetizar la PWA para que deje de tener tanto texto que confunda, corregir texto del desarrollador y mejorar UI/UX". Segunda pasada: eliminar `owner` visible, aclarar naturaleza SaaS y que SKNOMINA no es parte de contratos laborales.
- Estado: HU26-00 a HU26-06 ejecutado localmente; QA en curso
- Contexto: `.github/CODEX_CONTEXT.md`
- Prompts: `.github/prompts/HU26-00-baseline.md` a `.github/prompts/HU26-06-qa-release-saas.md`
- Diagnostico: `docs2/humanizacion-sintesis-pwa-2026/INFORME_DIAGNOSTICO_HU26.md`

## Diagnostico resumido

| ID | Severidad | Hallazgo | Accion HU26 |
|----|-----------|----------|-------------|
| HU26-F01 | Medio | Documentos legales repetian avisos largos sobre SUT/MDT y firmas. | Reemplazar por avisos compactos reutilizables. |
| HU26-F02 | Medio | Parametrizacion mezclaba orientacion legal, operativa y tecnica en bloques extensos. | Reducir textos y conservar responsabilidad del administrador principal. |
| HU26-F03 | Medio | Reportes y pagos bancarios usaban explicaciones largas y tecnicas. | Sintetizar instrucciones y mantener prechecks visibles. |
| HU26-F04 | Medio | Comunicaciones exponia jerga de desarrollo como `modo dev` y `dev_logged`. | Mostrar estados entendibles para administrador principal/soporte. |
| HU26-F05 | Bajo | Resultado de pago exponia "mock" al usuario. | Cambiar a "pendiente de confirmacion". |
| HU26-F06 | Bajo | Ficha del trabajador conservaba textos largos y enlace antiguo "Beneficios y descuentos". | Mejorar microcopy y alinear con "Descuento Anticipos". |
| HU26-F07 | Alto | Plantillas de contratos usaban SKNOMINA como si fuera sujeto contractual o fuente de calculo laboral. | Reescribir a EL EMPLEADOR / plantilla / expediente laboral, sin hacer a SKNOMINA parte del contrato. |
| HU26-F08 | Alto | Terminos y condiciones no enfatizaban suficientemente que SKNOMINA opera como SaaS y no reemplaza responsabilidad legal del cliente. | Agregar clausulas de naturaleza SaaS, responsabilidad del cliente, plantillas/calculos y limites del servicio. |
| HU26-F09 | Medio | Etiquetas visibles como `owner`, "Consola fundador" y "Superadmin" mantenian jerga interna. | Mostrar "Administrador principal" y "Soporte global" sin cambiar identificadores tecnicos. |
| HU26-F10 | Medio | Mensajes de parametrizacion seguian mezclando validacion tecnica con responsabilidad legal. | Usar "responsable", "administrador principal" y "soporte global" en UI. |

## Principios de solucion

- No cambiar contratos de API ni reglas legales.
- No ocultar bloqueos legales; sintetizarlos con siguiente accion clara.
- No duplicar avisos: usar `CompactNotice` como componente compartido.
- Mantener controles funcionales y estados existentes.
- Corregir ortografia visible al tocar una pantalla.
- Mantener UTF-8 sin BOM.
- Separar producto SaaS de relacion laboral: SKNOMINA no debe aparecer como empleador, representante, asesor, intermediario ni parte de documentos laborales.

## Fases

### HU26-00 baseline

- Confirmar pantallas PWA con mayor ruido textual.
- Registrar hallazgos y alcance sin tocar backend.
- Revisar `RULES.md` antes de cualquier cambio.

### HU26-01 componente de aviso

- Crear componente reusable `CompactNotice`.
- Sustituir avisos repetidos de documentos y parametrizacion.
- Mantener tonos visuales existentes.

### HU26-02 documentos, reportes, pagos y comunicaciones

- Sintetizar contratos, actas, dotacion, pagos bancarios y reportes.
- Reemplazar textos de desarrollo en comunicaciones.
- Conservar prechecks, descargas y bloqueos.

### HU26-03 ficha de trabajador y pagos

- Humanizar ficha de trabajador y resultado de pago.
- Corregir ortografia visible.
- Alinear enlace de nomina con "Descuento Anticipos".

### HU26-04 QA release

- Validar build PWA.
- Ejecutar `git diff --check` sobre archivos HU26.
- Verificar UTF-8 sin BOM en archivos modificados.
- Actualizar `AuditLock.json`.

### HU26-05 SaaS, contratos y roles humanos

- Reescribir plantillas legales para que la parte documental sea EL EMPLEADOR y EL TRABAJADOR.
- Reforzar terminos y condiciones: SKNOMINA es plataforma SaaS; el cliente valida datos, parametros, documentos, registros oficiales y cumplimiento legal.
- Sustituir etiquetas visibles `owner`, "fundador" y "Superadmin" por "Administrador principal" o "Soporte global".
- Mantener roles tecnicos `owner` y `superadmin` solo en permisos, rutas y payloads.

### HU26-06 QA release SaaS

- Validar que no queden menciones de SKNOMINA en plantillas contractuales como sujeto de obligaciones laborales.
- Validar build PWA y pruebas backend de generacion documental.
- Ejecutar contratos del sistema, `git diff --check`, UTF-8 y AuditLock.

## Candidatos no incluidos

- Reescritura editorial completa de toda la PWA: se deja fuera por riesgo y alcance; HU26 se enfoca en pantallas con evidencia de mayor densidad.
- Roles tecnicos `owner`/`superadmin`: no se renombran en API ni base de datos; solo se humanizan etiquetas visibles.
- Redisenos visuales amplios: no se reemplaza el sistema actual de Tailwind ni layout.

## Gates esperados

- `npm.cmd --workspace=frontend-web run build`
- `npm.cmd --workspace=backend test -- templateGenerator.test.js --runInBand`
- `npm.cmd run contracts`
- `git diff --check -- <archivos HU26>`
- Escaneo UTF-8 sin BOM y sin mojibake en archivos HU26.
