# PLAN HAIKY HUMANIZACION SINTESIS PWA 2026

## Identificacion

- Codigo: HU26
- Sistema: SKNOMINA / nomina-ec
- Fecha: 2026-07-09
- Fuente: "Humanizar y sintetizar la PWA para que deje de tener tanto texto que confunda, corregir texto del desarrollador y mejorar UI/UX".
- Estado: ejecutado localmente; QA en curso
- Contexto: `.github/CODEX_CONTEXT.md`
- Prompts: `.github/prompts/HU26-00-baseline.md` a `.github/prompts/HU26-04-qa-release.md`
- Diagnostico: `docs2/humanizacion-sintesis-pwa-2026/INFORME_DIAGNOSTICO_HU26.md`

## Diagnostico resumido

| ID | Severidad | Hallazgo | Accion HU26 |
|----|-----------|----------|-------------|
| HU26-F01 | Medio | Documentos legales repetian avisos largos sobre SUT/MDT y firmas. | Reemplazar por avisos compactos reutilizables. |
| HU26-F02 | Medio | Parametrizacion mezclaba orientacion legal, operativa y tecnica en bloques extensos. | Reducir textos y conservar responsabilidad del owner. |
| HU26-F03 | Medio | Reportes y pagos bancarios usaban explicaciones largas y tecnicas. | Sintetizar instrucciones y mantener prechecks visibles. |
| HU26-F04 | Medio | Comunicaciones exponia jerga de desarrollo como `modo dev` y `dev_logged`. | Mostrar estados entendibles para owner/soporte. |
| HU26-F05 | Bajo | Resultado de pago exponia "mock" al usuario. | Cambiar a "pendiente de confirmacion". |
| HU26-F06 | Bajo | Ficha del trabajador conservaba textos largos y enlace antiguo "Beneficios y descuentos". | Mejorar microcopy y alinear con "Descuento Anticipos". |

## Principios de solucion

- No cambiar contratos de API ni reglas legales.
- No ocultar bloqueos legales; sintetizarlos con siguiente accion clara.
- No duplicar avisos: usar `CompactNotice` como componente compartido.
- Mantener controles funcionales y estados existentes.
- Corregir ortografia visible al tocar una pantalla.
- Mantener UTF-8 sin BOM.

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

## Candidatos no incluidos

- Reescritura editorial completa de toda la PWA: se deja fuera por riesgo y alcance; HU26 se enfoca en pantallas con evidencia de mayor densidad.
- Cambios de permisos URR26 abiertos en el arbol: no se mezclan con HU26.
- Redisenos visuales amplios: no se reemplaza el sistema actual de Tailwind ni layout.

## Gates esperados

- `npm.cmd --workspace=frontend-web run build`
- `git diff --check -- <archivos HU26>`
- Escaneo UTF-8 sin BOM y sin mojibake en archivos HU26.
