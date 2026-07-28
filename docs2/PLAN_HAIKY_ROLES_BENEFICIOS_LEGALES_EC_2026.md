# Plan Haiky: roles de beneficios legales Ecuador 2026

## Identificación

- **Plan:** `HAIKY-ROLES-BENEFICIOS-LEGALES-EC-2026`
- **Código:** `BPR26`
- **Superficie:** backend, base de datos, contabilidad, reportes y frontend web de Nómina.
- **Fuente de gobierno:** `RULES.md`, `CODEX_CONTEXT.md` y `AuditLock.json`.
- **Objetivo:** convertir los reportes preparatorios de beneficios en una operación visible para el usuario: generar, revisar, aprobar, cerrar y descargar roles de pago de beneficios legales.

## Hallazgo que corrige

Los reportes anuales ya mostraban provisiones mensuales y algunos valores pagados en la nómina ordinaria, pero no existía una entidad ni una ruta operativa para generar el rol acumulado de beneficios legales. Esto impedía pagar y auditar desde el sistema el décimo tercero, décimo cuarto, participación laboral, compensación de salario digno y la conciliación de fondos de reserva.

## Alcance funcional

1. Crear una ruta unificada **Roles de beneficios** dentro de Roles de pago.
2. Generar borradores por tipo de beneficio, ejercicio, región cuando aplique, fecha de pago y parámetros legales.
3. Incluir como beneficios operables:
   - décimo tercero acumulado;
   - décimo cuarto acumulado, separado por Costa/Galápagos y Sierra/Amazonía;
   - participación laboral/utilidades;
   - compensación de salario digno;
   - fondos de reserva como conciliación de pago al empleado o depósito directo al IESS según modalidad parametrizada.
4. Diferenciar en cada línea **provisión mensual**, **ajuste legal** y **pago del rol**.
5. Para décimo cuarto, usar el SBU/SMV oficial vigente a la fecha de pago y generar automáticamente el ajuste contra lo provisionado. El valor quedará guardado en el rol para que un cambio posterior no altere la evidencia.
6. Aplicar fechas legales parametrizadas para Ecuador, sin ocultar una advertencia ni bloquear el documento por una fecha operativa distinta; el usuario debe poder revisar y corregir antes de aprobar.
7. Exponer revisión, aprobación, cierre y descarga XLSX/PDF del rol.
8. Guardar fuente de cálculo, parámetros, momento contable, correlación y auditoría por operación.
9. Mantener la separación conceptual entre provisión mensual, pago acumulado, anticipo/descuento y liquidación de vacaciones. Las vacaciones no se ofrecerán como rol periódico si el caso corresponde a disfrute o finiquito.

## Reglas legales y de usuario

- República del Ecuador: décimo tercero acumulado hasta el 24 de diciembre; décimo cuarto acumulado hasta el 15 de marzo en Costa/Galápagos o el 15 de agosto en Sierra/Amazonía, según la modalidad y región del empleado.
- El sistema no sustituye la validación de la fuente oficial. Si el parámetro legal no está validado, el backend debe impedir el cierre productivo y mostrar al usuario la acción requerida.
- El SBU/SMV de pago se captura como parámetro versionado; si difiere del valor usado en provisiones, el rol muestra ajuste positivo o negativo y el asiento debe conservar el momento `ajuste_provision_beneficio`.
- Participación laboral y salario digno requieren sus bases oficiales de cálculo; no se presentarán como valores inventados a partir de una simple nómina.

## Fases

| Fase | Entregable | Estado |
|---|---|---|
| BPR26-00 | Diagnóstico, alcance, gobierno, referencias oficiales y contratos | completado |
| BPR26-01 | Persistencia, cálculo, fechas, ajustes SBU/SMV y auditoría | completado |
| BPR26-02 | Rutas API, roles, descargas y vínculo contable | completado |
| BPR26-03 | Superficie frontend operable en Roles de pago | completado |
| BPR26-04 | Pruebas, regresión, cierre de AuditLock y publicación | completado |

## Criterios de aceptación

- Un usuario de Nómina puede generar un borrador sin salir de Roles de pago.
- El borrador muestra por empleado provisión, ajuste, pago, modalidad, destino y periodo legal.
- Décimo cuarto recalcula la diferencia con el SBU/SMV vigente a la fecha de pago y no altera los roles mensuales históricos.
- No se puede aprobar dos veces el mismo beneficio/ejercicio/región ni cerrar líneas con datos incompletos.
- Los reportes XLSX/PDF se descargan desde la pantalla y contienen una hoja/sección de auditoría.
- Participación laboral y salario digno exigen sus parámetros de cálculo visibles.
- Las APIs mantienen tenant, rol, correlación y auditoría.
- Suite backend, Prisma, validación de sintaxis, build frontend y `git diff --check` pasan.

## Riesgos controlados

- **Desfase SBU/SMV:** se conserva el valor de provisión y se genera una línea de ajuste, nunca una modificación retroactiva de la nómina mensual.
- **Doble pago:** índice y validación transaccional por beneficio, año y región.
- **Confusión de conceptos:** etiquetas de usuario y columnas distinguen provisión, ajuste, pago y destino.
- **Vacaciones:** se mantienen en el flujo de finiquito/disfrute; no se crea un camino paralelo de pago periódico.
- **Fuente legal pendiente:** el sistema muestra el bloqueo y la acción requerida antes de cerrar.
