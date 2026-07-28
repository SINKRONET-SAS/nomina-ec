# Plan Haiky: reportes laborales obligatorios 2026

## Objetivo

Convertir la promesa comercial de reportes laborales en funcionalidad visible y descargable dentro de `Reportes para entidades públicas`. El alcance cubre la legislación aplicable de la República del Ecuador y reportes preparatorios, trazables y auditables para décimo tercero, décimo cuarto, participación laboral/utilidades, salario digno y beneficios laborales acumulados.

La salida se etiqueta como preparación para revisión y presentación ante la autoridad competente de Ecuador. SKNOMINA no sustituye el registro externo en SUT/MDT ni la validación legal del empleador.

## Hallazgo y alcance confirmado

La pantalla actual muestra únicamente tarjetas informativas para “Ministerio del Trabajo: reportes laborales según la obligación aplicable”, “Contraloría/UAFE” y “Anexos SRI”. No existe control para generar o descargar los reportes laborales prometidos.

Se implementará:

1. Códigos de reporte anuales en el catálogo y motor central de reportes.
2. Cálculo trazable por empleado a partir de roles del ejercicio, días trabajados, modalidades y provisiones registradas.
3. Participación laboral con base de utilidad líquida y reparto 10% por días y 5% por cargas familiares.
4. Salario digno con umbral oficial ingresado por el usuario y compensación disponible informada, sin inventar valores normativos.
5. Reporte consolidado de décimos, fondos de reserva y vacaciones como “beneficios laborales acumulados”.
6. Controles visibles de generación y descarga en la ruta existente `/dashboard/nomina/reportes`, reemplazando las tarjetas pasivas.
7. Hoja de auditoría, fórmulas, parámetros de entrada, advertencia de preparación y correlation ID en cada archivo.
8. Clasificación contable explícita de `provision_mensual`, `pago_rol`, `pago_anticipo` y `descuento_rol`, reutilizable por la generación de asientos.

## Criterios de aceptación

- Los controles de décimo tercero, décimo cuarto, participación laboral, salario digno y beneficios acumulados aparecen en la pantalla vigente de Reportes.
- Cada control genera un XLSX anual descargable desde el endpoint consolidado existente y no una ruta frontend paralela.
- El archivo contiene una fila por empleado, período, días, datos de cálculo, fuente y observación de validación.
- Utilidades no se generan como cero silencioso: exige utilidad líquida y registra la base usada.
- Salario digno no se genera sin umbral mensual; la compensación disponible queda explícita y se prorratea cuando es insuficiente.
- Se conservan RBAC, capability `advancedReports`, aislamiento por tenant y auditoría.
- Se conserva el comportamiento de reportes mensuales, RDEP, Formulario 107, IESS, contables y acumulado anual existente.
- Los reportes se identifican como preparatorios para SUT/MDT y no como constancia oficial presentada.

## Referencias normativas de verificación

- Ministerio del Trabajo, calculadora de salario digno: https://calculadoras.trabajo.gob.ec/salarioDigno
- Manual de salario digno: https://calculadoras.trabajo.gob.ec/manualSalarioDigo
- Ministerio del Trabajo, décimo tercero y décimo cuarto: https://www.trabajo.gob.ec/29-cual-es-el-plazo-y-como-se-debe-realizar-la-solicitud-de-la-acumulacion-del-pago-de-la-decima-tercera-y-decima-cuarta-remuneracion/
- Ministerio del Trabajo, distribución del 15% de utilidades: https://www.trabajo.gob.ec/10-como-se-divide-el-porcentaje-de-utilidades/
- Portal SUT del Ministerio del Trabajo: https://sutmdt.trabajo.gob.ec/dashboard

## Fases y gobierno

| Fase | Objetivo | Evidencia | Estado |
|---|---|---|---|
| RLT26-00 | Baseline, alcance, contexto y prompts | artefactos Haiky y AuditLock encadenado | completed-pass |
| RLT26-01 | Motor anual y catálogo de reportes laborales | servicio, columnas, auditoría y pruebas | completed-pass |
| RLT26-02 | Fórmulas de utilidades, salario digno y beneficios | validaciones, parámetros y pruebas de casos | completed-pass |
| RLT26-03 | Exposición funcional en Reportes | controles, descarga y estados de error | completed-pass |
| RLT26-04 | Regresión, UTF-8, cierre y release | suites, build, diff, AuditLock cerrado | completed-pass |

Cada fase debe actualizar `.vscode/AuditLock.json` con `phaseCompleted`, archivos modificados, validaciones y firma SHA256 encadenada al contenido anterior más timestamp. No se inicia la fase siguiente sin cerrar la anterior.

## Cierre ejecutado

- Los cinco reportes laborales de Ecuador quedaron visibles y descargables en la ruta existente de Reportes.
- La salida distingue provisión mensual, pago en rol, pago de anticipo y descuento de anticipo; los momentos contables quedan en metadata y en las hojas de auditoría.
- La suite backend completa quedó en 67 suites y 456 pruebas aprobadas; `libxmljs2` está disponible.
- Prisma, `node --check`, parseo JSON, verificación UTF-8 sin BOM, `git diff --check` y build Vite terminaron correctamente.
- El AuditLock quedó cerrado con cadena SHA256 y todos los artefactos RLT26 reflejan `completed-pass`.

## Riesgos y controles

- Los valores legales cambian: el umbral de salario digno se solicita explícitamente y se conserva como parámetro del archivo.
- Los datos de utilidad líquida no viven en el rol mensual: utilidades exige ingreso controlado de la base y la deja en la auditoría.
- Un reporte preparatorio puede confundirse con declaración oficial: cada hoja contiene la advertencia y la fuente de verificación.
- Cambios en el motor central pueden afectar reportes existentes: se ejecutan pruebas backend, validación Prisma, parseo/build frontend y smoke de rutas.
- Un mismo concepto puede tener provisión y pago en momentos distintos: la parametrización contable conserva `momentoContable` en metadata y los asientos lo exponen.

## Cierre esperado

Plan `HAIKY-REPORTES-LABORALES-OBLIGATORIOS-2026` (`RLT26`) cerrado con todos los artefactos actualizados, pruebas verdes, sin cambios fuera de `nuevo_nomina`, commit con formato `phase: RLT26-04; task: cerrar reportes laborales` y push a `main`.
