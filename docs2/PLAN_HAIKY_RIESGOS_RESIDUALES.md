# Plan HAIKY - Cierre de riesgos residuales

Proyecto: nomina-ec  
Fecha de plan: 2026-06-12  
Estado base: fase 16 firmada en `.vscode/AuditLock.json`  
Alcance: valores legales 2026, AWS SDK v3 y prueba RLS en Render con usuario no superusuario.

## Regla de ejecucion

Antes de ejecutar cualquiera de estas fases se debe leer `RULES.md`, validar que `.vscode/AuditLock.json` este firmado y confirmar que la fase anterior haya cerrado sin archivos pendientes. Este plan no autoriza cambios runtime por si solo; cada fase requiere ejecucion explicita y cierre de candado.

## Riesgo 1 - Valores legales 2026 pendientes de validacion oficial

### Situacion

El sistema ya soporta parametros legales versionados en base de datos y mantiene respaldo en `backend/src/config/legal-ecuador.js`, pero los valores 2026 siguen marcados como `pendiente_validacion_oficial`. Esto impide declarar cumplimiento legal completo para calculos de IESS, decimos, vacaciones, liquidacion, finiquito, impuesto a la renta y redondeos.

### Fase 17 - Validacion legal Ecuador 2026

Objetivo: cerrar la brecha documental y tecnica de valores legales 2026 sin inventar fuentes ni asumir vigencia.

Acciones:

- Levantar matriz de parametros 2026 con campo, valor actual, fuente requerida, fecha de publicacion, responsable y estado.
- Verificar cada valor contra fuente oficial aplicable antes de cambiar configuracion productiva.
- Mantener `pendiente_validacion_oficial` cuando no exista evidencia suficiente.
- Actualizar seeds o parametros en DB solo con respaldo documental.
- Agregar prueba automatizada que bloquee calculos productivos cuando un periodo use parametros no validados.
- Documentar redondeo legal por concepto: aportes, ingresos gravables, decimos, vacaciones, liquidacion y pagos bancarios.

Entregables:

- `docs2/MATRIZ_LEGAL_ECUADOR_2026.md`.
- Ajustes versionados en parametros legales si existe fuente oficial suficiente.
- Tests de bloqueo o advertencia para parametros no validados.
- AuditLock firmado para fase 17.

Criterio de salida:

- Ningun calculo productivo 2026 queda marcado como validado sin fuente oficial.
- Cada parametro usado por nomina tiene estado, fuente, fecha y responsable.

## Riesgo 2 - AWS SDK v2 pendiente de migracion a v3

### Situacion

El backend mantiene `aws-sdk` v2 en `backend/package.json` y `backend/src/config/s3.js`. AWS SDK v2 debe migrarse a clientes modulares v3 para reducir superficie de dependencia y preparar mantenimiento de largo plazo.

### Fase 18 - Migracion AWS SDK v3

Objetivo: reemplazar el uso de `aws-sdk` v2 por AWS SDK v3 sin cambiar contratos publicos de carga, descarga, URL firmada y eliminacion.

Acciones:

- Instalar dependencias modulares requeridas: `@aws-sdk/client-s3` y `@aws-sdk/s3-request-presigner`.
- Reescribir `backend/src/config/s3.js` con `S3Client`, `PutObjectCommand`, `GetObjectCommand`, `DeleteObjectCommand` y `getSignedUrl`.
- Mantener nombres de funciones exportadas para compatibilidad.
- Corregir logs y errores para cumplir `RULES.md`: mensajes visibles en espanol, sin `catch` silenciosos y con error estructurado cuando aplique.
- Agregar prueba unitaria con mocks del cliente S3 para upload, signed URL y delete.
- Eliminar `aws-sdk` v2 del manifiesto y lockfile.

Entregables:

- `backend/src/config/s3.js` migrado a v3.
- Dependencias actualizadas.
- Test unitario S3.
- AuditLock firmado para fase 18.

Criterio de salida:

- No existe referencia runtime a `require('aws-sdk')`.
- Tests pasan y no cambia el contrato de las funciones publicas S3.

## Riesgo 3 - RLS debe probarse en Render con usuario no superusuario

### Situacion

Existe migracion SQL con politicas RLS, pero falta evidencia de ejecucion en Render con un usuario de base de datos no superusuario. Sin esta prueba no se puede afirmar aislamiento tenant en el entorno administrado.

### Fase 19 - Prueba RLS Render con usuario no superusuario

Objetivo: comprobar que las politicas RLS funcionan en Render con credenciales no privilegiadas y que un tenant no puede leer ni modificar datos de otro tenant.

Acciones:

- Crear o confirmar usuario de aplicacion no superusuario en PostgreSQL Render.
- Ejecutar migraciones con el mecanismo autorizado sin degradar politicas RLS.
- Preparar datos minimos de dos tenants de prueba.
- Ejecutar consultas de lectura y escritura con contexto tenant valido e invalido.
- Registrar evidencia sin secretos: comando, resultado esperado, resultado obtenido, timestamp y hash del script usado.
- Agregar script repetible de verificacion RLS para entorno staging.
- Documentar rollback operativo si una politica bloquea operaciones legitimas.

Entregables:

- `docs2/RUNBOOK_RLS_RENDER.md`.
- Script de verificacion RLS para staging.
- Evidencia de prueba con usuario no superusuario.
- AuditLock firmado para fase 19.

Criterio de salida:

- Usuario no superusuario no puede cruzar tenants.
- La API conserva operaciones esperadas para el tenant autenticado.
- La evidencia no contiene credenciales ni datos personales reales.

## Cronograma recomendado

1. Fase 17: 1 a 2 dias habiles, depende de disponibilidad de fuentes oficiales y revision profesional.
2. Fase 18: 0.5 a 1 dia habil, requiere instalacion de dependencias y tests S3.
3. Fase 19: 1 dia habil, requiere acceso Render staging y credenciales no superusuario.

## Bloqueos antes de produccion

- No liberar nomina 2026 como validada si la matriz legal conserva estados `pendiente_validacion_oficial`.
- No cerrar hardening de dependencias mientras `aws-sdk` v2 siga en runtime.
- No declarar aislamiento tenant completo hasta probar RLS en Render con usuario no superusuario.

