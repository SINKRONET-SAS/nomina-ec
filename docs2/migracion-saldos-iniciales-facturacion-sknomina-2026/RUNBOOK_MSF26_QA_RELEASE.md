# Runbook MSF26 - QA y release

## Preparacion

1. Confirmar aprobacion explicita de la fase.
2. Revisar `RULES.md`, `.github/CODEX_CONTEXT.md` y `.vscode/AuditLock.json`.
3. Verificar que no existan secretos en archivos modificados.
4. Ejecutar diagnostico en SKNOMINA y, solo como lectura, en `C:\proyectos web\sinkroniq-mobile`.

## Variables esperadas

Las variables son nombres de contrato; los valores reales no deben guardarse en repo:

- `SINKRONET_FACTURADOR_BASE_URL`
- `SINKRONET_FACTURADOR_API_KEY`
- `SINKRONET_FACTURADOR_WEBHOOK_SECRET`
- `SINKRONET_FACTURADOR_TIMEOUT_MS`
- `SINKRONET_FACTURADOR_ENVIRONMENT`

## Gates por fase runtime

```powershell
npm.cmd run contracts
npm.cmd run prisma:validate
npm.cmd --workspace=backend test -- --runInBand
npm.cmd --workspace=frontend-web run build
npm.cmd run check:mobile
git diff --check
```

## QA saldos iniciales

- Cargar plantilla DEMO con dry-run.
- Verificar errores por fila con cedula inexistente, periodo cerrado, monto invalido y tipo de saldo desconocido.
- Aprobar lote DEMO y confirmar registros creados con `source_batch_id`.
- Revertir lote DEMO no consolidado.
- Confirmar que nominas cerradas no cambian.
- Confirmar que el dashboard PWA muestra estado e historial.

## QA facturacion

- Configurar mock local o endpoint seguro del facturador en certificacion.
- Enviar payload con `Idempotency-Key` y repetirlo; debe retornar misma referencia sin duplicar.
- Simular timeout y verificar estado `blocked` o `retry_pending`.
- Simular webhook firmado de autorizado y rechazado.
- Confirmar que UI muestra numero/clave/enlaces solo si el contrato los devuelve.
- Confirmar que no se emite factura real si faltan credenciales o ambiente productivo aprobado.

## Rollback

- Cambios de esquema: migracion compensatoria documentada, nunca `reset`.
- Saldos iniciales: revertir por lote y conservar auditoria.
- Facturacion: desactivar cliente por variable de entorno y mantener registros `blocked`.
- UI: ocultar accion de emision si readiness falla, no borrar historial fiscal.

## Cierre

- Actualizar reporte de fase en `docs2/migracion-saldos-iniciales-facturacion-sknomina-2026`.
- Actualizar `.github/CODEX_CONTEXT.md`.
- Firmar `.vscode/AuditLock.json`.
- Commit con formato: `phase: MSF26-XX task: <descripcion>`.
