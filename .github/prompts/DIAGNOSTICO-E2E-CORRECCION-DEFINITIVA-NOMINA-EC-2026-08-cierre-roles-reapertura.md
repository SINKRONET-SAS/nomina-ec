# E2E26-08 - Cierre atomico, roles y reapertura controlada

Actua bajo `RULES.md`.

Objetivo: convertir el cierre en un flujo atomico y la reapertura en rectificacion auditable.

Tareas:

- Validar AuditLock E2E26-07.
- Revisar cierre, reapertura, beneficios, roles PDF, mobile payroll y reportes.
- Implementar/adaptar gate pre-cierre.
- Generar o validar roles PDF antes de cerrar.
- Aplicar beneficios/deducciones de forma idempotente.
- En reapertura, registrar motivo, reverso o evento de rectificacion antes de recalcular.
- Corregir copy de "inmutable" a "reapertura controlada" donde aplique.

Cierre:

- Cierre incompleto no puede pasar a `closed`.
- Reapertura no deja saldos de beneficios inconsistentes.
- AuditLock firmado para E2E26-08.
- Commit esperado: `phase: E2E26-08 task: cierre atomico reapertura`.
