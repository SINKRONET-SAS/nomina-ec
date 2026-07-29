# Plan Haiky: versionamiento visible de parámetros legales de Ecuador

## Identificación

- Plan: `HAIKY-VERSIONES-PARAMETROS-LEGALES-EC-2026`
- Código: `PVE26`
- Superficie única: `Parametrización > Valores legales`
- País y marco: República del Ecuador
- Objetivo: hacer visible para el usuario final el historial de parámetros legales y evitar que una edición destruya la trazabilidad.

## Problema confirmado

`legal_parameter_versions` conserva campos de vigencia, pero la edición actual actualiza la fila vigente en lugar de crear una nueva versión. La pantalla solo consulta la fila vigente y no ofrece historial, comparación ni restauración. No se debe corregir una versión histórica directamente: una corrección o restauración debe crear una nueva versión con vigencia explícita, cerrar la anterior y conservar el registro usado por cálculos ya realizados.

## Decisiones de producto

1. El usuario no necesita acceso a PostgreSQL: verá el historial desde la misma pantalla de Valores legales.
2. La fila histórica es inmutable. El botón de edición aplica a la versión vigente y genera una nueva versión; no sobrescribe la anterior.
3. Restaurar significa copiar una versión histórica a una nueva versión; nunca reabrir ni modificar la fila antigua.
4. Cada versión muestra valor, año, vigencia, estado, fuente, usuario y fecha de validación, además de quién la creó y cuándo.
5. La pantalla identifica qué versión alimentará los cálculos nuevos y presenta una comparación contra la versión seleccionada.
6. La fuente oficial validada se distingue del estado pendiente. Las divergencias se explican con una instrucción de revisión en Parametrización, sin bloquear con mensajes genéricos cuando los parámetros ya fueron validados.
7. Los roles, nóminas y asientos cerrados mantienen sus snapshots; una nueva versión no reescribe resultados históricos.

## Fases y salidas

| Fase | Objetivo | Salida verificable |
|---|---|---|
| `PVE26-00` | Gobierno, alcance, baseline y contrato | Plan, contexto, AuditLock y prompts encadenados |
| `PVE26-01` | Persistencia inmutable | Migración con metadatos de versión y reglas de cierre |
| `PVE26-02` | Servicio y API | Historial, comparación por datos y restauración como nueva versión |
| `PVE26-03` | Experiencia en pantalla | Botón “Ver historial de versiones”, detalle, comparación y restauración |
| `PVE26-04` | Regresión y cierre | Suites, build, validaciones de gobierno, commit y push |

## Contratos y controles

- Se conservan los endpoints existentes de resumen, creación, edición y eliminación.
- Se agregan endpoints explícitos para historial y restauración; la restauración exige perfil autorizado y auditoría.
- La vigencia nueva se valida como fecha ISO y la fila anterior deja de ser activa. No se permite cerrar dos veces la misma versión ni restaurar sobre una versión histórica.
- La eliminación de parámetros sigue su control de consumos y no es un mecanismo de corrección histórica.
- Toda respuesta de error debe indicar la acción y ubicación de revisión para el usuario final.
- La migración es reversible mediante el SQL de rollback documentado en el propio archivo y no elimina datos históricos.

## Criterios de aceptación

- Un cambio a un parámetro vigente deja al menos dos filas: la anterior cerrada y la nueva vigente.
- La pantalla muestra el historial sin acceso a la base de datos y distingue la versión que se usará en el próximo cálculo.
- La comparación muestra diferencias de valor, vigencia, fuente y estado.
- Restaurar una versión crea otra fila y conserva intactas ambas versiones originales.
- Usuario, fuente y fecha de validación son visibles y auditables.
- Parámetros oficiales de Ecuador permanecen compatibles con la fuente validada y no se introducen rutas paralelas.
- Backend, frontend, Prisma, UTF-8 sin BOM y `git diff --check` pasan antes de publicar.

## Riesgos y mitigaciones

- **Fecha de vigencia ambigua:** se exige `Vigente desde` y se muestra la fecha efectiva en el historial.
- **Corrección retroactiva indebida:** no se edita una fila histórica ni se altera una nómina cerrada; el usuario debe generar una nueva versión.
- **Carga inicial repetida:** el loader debe respetar la versión validada y no destruirla.
- **Exposición de identificadores:** los usuarios se muestran con nombre/correo disponible y nunca se exponen secretos.

## Evidencia final requerida

La evidencia de cada fase se registra en `.github/CODEX_CONTEXT.md` y `.vscode/AuditLock.json`. El cierre solo se marca cuando las pruebas y la revisión de regresiones son reproducibles.
