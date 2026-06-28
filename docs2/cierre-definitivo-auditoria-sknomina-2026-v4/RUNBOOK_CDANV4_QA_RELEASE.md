# RUNBOOK CDANV4 - QA Y RELEASE

## Orden

1. Verificar `RULES.md`.
2. Ejecutar prompts CDANV4-00 a CDANV4-05 en orden.
3. Confirmar que `/api/pagos/confirm` apunte a `paymentReturn`.
4. Confirmar que app mobile exponga Permisos y Mi Nómina.
5. Confirmar que PWA exponga historial laboral desde Empleados.
6. Ejecutar gates:
   - `npm.cmd --workspace=backend test -- app.routes.test.js mobileController.test.js paymentController.test.js payrollRolePdfService.test.js communicationService.test.js payphoneGatewayService.test.js`
   - `npm.cmd run prisma:validate`
   - `npm.cmd run build:web`
   - `npm.cmd run check:mobile`
7. Revisar `rg` para menciones activas de NOMINA-EC.
8. Actualizar AuditLock.
9. Commit con `phase: CDANV4-05 task: cierre-v4`.
10. Push a `origin main`.

## Rollback

- Restaurar ruta GET `/api/pagos/confirm` solo si existe alternativa segura documentada.
- Retirar `PermisosScreen` y endpoints mobile si una validacion legal exige rediseño; las novedades creadas siguen siendo auditablemente visibles en PWA.
- Si el cambio de bundle id/scheme mobile requiere continuidad de tienda, documentar alias temporal antes de publicar.
