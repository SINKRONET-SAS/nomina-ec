# RUNBOOK CDANV3 - QA Y RELEASE

## Objetivo

Validar el cierre definitivo de auditoria Nomina-EC V3 antes de liberar runtime a staging o produccion.

## Precondiciones

- `RULES.md` leido y aplicado.
- `.vscode/AuditLock.json` firmado para la fase anterior.
- Variables reales de Payphone y superadmin cargadas en el ambiente, no en git.
- Base de datos staging disponible.
- Empresa DEMO resembrable con datos ficticios.

## Secuencia por fase

1. Ejecutar el prompt de fase aprobado.
2. Revisar `git status --short`.
3. Implementar cambios sin tocar archivos ajenos a la fase.
4. Ejecutar pruebas focales.
5. Actualizar reporte de fase y AuditLock.
6. Commit `phase: CDANV3-XX task: ...`.
7. Avanzar solo si el usuario aprueba la siguiente fase.

## Gates minimos

```powershell
npm.cmd run contracts
npm.cmd run prisma:validate
npm.cmd run test:backend
npm.cmd run build:web
npm.cmd run check:mobile
```

## Smoke Payphone

- Crear intento de pago con plan de prueba.
- Confirmar que la referencia contiene tenant y plan de forma no ambigua.
- Enviar webhook de prueba aprobado.
- Verificar activacion de plan, auditoria y respuesta idempotente.
- Enviar webhook rechazado y confirmar que no activa plan.

## Smoke seed Render

- Ejecutar comando de build/deploy staging.
- Confirmar que `seed:admins` es idempotente.
- Confirmar que faltantes `SUPERADMIN_*` producen bloqueo claro.
- Confirmar que no se imprimen secretos en logs.

## Smoke auth

- Login genera token con claims requeridos.
- Request normal autenticado no consulta DB para reconstruir usuario.
- Operacion critica usa verificacion fresca.
- Token legado tiene comportamiento compatible o rechazo claro.

## Smoke movilizacion

- En app movil DEMO registrar gasto offline.
- Cerrar informe mensual y sincronizar.
- En PWA aprobar informe con monto de anticipo.
- Ver estado aprobado en app del empleado.
- Rechazar otro informe con motivo y confirmar visibilidad.
- Exportar o visualizar reporte de movilizacion si la fase lo incluye.

## Rollback

- Payphone: desactivar webhook por feature flag o env si falla validacion.
- Auth: mantener compatibilidad temporal con tokens previos o forzar re-login.
- Movilizacion: migracion debe tener rollback documentado para tablas nuevas.
- Render seed: revertir buildCommand y ejecutar seed manual controlado si staging falla.

## Evidencia requerida

- Logs sin secretos.
- Capturas o reporte textual de UI PWA/mobile cuando aplique.
- Resultados de tests.
- Hash y firma de AuditLock.
