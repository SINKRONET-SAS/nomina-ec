# Runbook CDAN26 - QA y Release

## Precondiciones

- `AuditLock.json` de la fase anterior firmado y valido.
- Aprobacion explicita del prompt de fase.
- Worktree revisado para no sobrescribir cambios ajenos.
- Variables productivas reales nunca escritas en archivos versionados.

## Secuencia de validacion

1. Ejecutar diagnostico de codigo y schema de la fase.
2. Implementar cambios con alcance minimo.
3. Ejecutar validaciones unitarias o contractuales del modulo afectado.
4. Ejecutar gates generales: `npm run contracts`, `npm run prisma:validate`, `npm run test:backend`, `npm run build:web`, `npm run check:mobile`.
5. Ejecutar smoke PWA de las rutas afectadas.
6. Actualizar reporte de fase y `AuditLock.json`.

## Smokes funcionales CDAN26

- Seguridad: buscar `plan_haiky` y `haiky_migration` en runtime expuesto; solo se aceptan menciones documentales internas historicas.
- Legal: intentar calcular nomina con salario inferior a SBU vigente y verificar bloqueo visible.
- Fondo de Reserva: cambiar modalidad de empleado y verificar calculo/reportes.
- SRI: generar Formulario 107 individual PDF con datos completos y revisar bloqueo con datos faltantes.
- Calculo: simular fallo parcial y verificar rollback del estado de periodo.
- Pagos: checkout sandbox o bloqueo visible si faltan credenciales.
- Email: publicar rol y verificar auditoria de `sendRolPagoDisponible()`.
- Superadmin: crear/versionar parametro legal anual con fuente y vigencia.

## Bloqueos externos

- Revision legal laboral y tributaria Ecuador antes de produccion.
- Credenciales reales de Stripe o proveedor de pagos.
- Proveedor SMTP/API transaccional y remitente verificado.
- Entorno Render/staging disponible para validacion de infraestructura.
