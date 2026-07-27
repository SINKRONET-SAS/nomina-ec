# BAI26-05 - QA, regresion y cierre

- **Plan**: `HAIKY-BENEFICIOS-ANTICIPOS-INTEGRAL-2026`
- **Codigo fase**: `BAI26-05`
- **Estado**: `pending`
- **Prerequisito**: AuditLock `BAI26-04` firmado

## Objetivo

Validacion integral de todas las correcciones, tests de regresion y cierre del plan con AuditLock firmado.

## Tareas

### BAI26-05-T1: Tests unitarios legales

- Test: prestamos capped a 10% ingreso bruto (Art. 91)
- Test: anticipos no dejan liquido negativo (Art. 83)
- Test: beneficio sin consentimiento no puede aprobarse

### BAI26-05-T2: Tests de validacion

- Test: cuotaMensual > montoTotal rechazado
- Test: empleado inactivo no puede tener beneficio aprobado
- Test: decideLine idempotente con misma decision

### BAI26-05-T3: Test regresion cerrarMes

- Test: cerrarMes con beneficios aprobados decrementa saldo correctamente
- Test: cerrarMes no duplica descuento en mismo periodo
- Test: beneficio pasa a estado 'descontado' cuando saldo llega a 0

### BAI26-05-T4: Gates de calidad

- `node --check` en todos los archivos modificados
- `npx prisma validate` PASS
- Backend tests: todas las suites PASS
- `git diff --check` sin whitespace errors

### BAI26-05-T5: Build web

- PWA build PASS sin errores de compilacion
- Verificar que Beneficios.jsx renderiza sin errores en consola

### BAI26-05-T6: AuditLock cierre

- Actualizar AuditLock con BAI26-05 completed-pass
- Firmar con SHA256 del lock anterior + timestamp
- Commit final con `phase: BAI26-05 task: BAI26-05-FINAL`

## Validacion de cierre

- [ ] Todos los tests nuevos PASS
- [ ] Suite backend completa PASS
- [ ] node --check PASS
- [ ] Prisma validate PASS
- [ ] PWA build PASS
- [ ] AuditLock firmado
- [ ] Commit + push con tag de fase
