# AISK26-09: Legal, Pagos y Email Hardening

**Plan:** HAIKY-AUDITORIA-INTEGRAL-SKNOMINA-2026
**Fase:** 09
**Prerequisito:** AISK26-08 firmado
**Hallazgos:** HAL-40..42, HAL-50..52, HAL-70..72, HAL-80..81, HAL-90..92

## Objetivo

Endurecer cumplimiento legal Ecuador, canal PayPhone, servicio email y entorno SUPERADMIN.

## Tareas

### Legal Ecuador (HAL-90..92)
1. legal-ecuador.js: completar validacion de 5 parametros pendientes (decimoCuartoMeses, fondoReservaMeses, maxHorasExtraSemanales, limiteGastosPersonales)
2. Agregar parametros 2025 con sourceStatus 'legacy' para retroactivos
3. Agregar purga de comunicaciones al cron schedule (LOPDP)
4. assertPendingValidationBlocking(): bloquear calculo si parametros criticos no estan validados

### PayPhone (HAL-40..42)
5. payphoneGatewayService: health check async al arranque (no bloquea, solo logger.warn si falla)
6. Documentar ciclo de vida de suscripcion (renovacion, gracia, downgrade)
7. Agregar CORPORATIVO a FALLBACK_PUBLIC_PLANS con precioMensual null

### Email (HAL-50..52)
8. communicationService: cuando sendRolPagoDisponible skip por email_invalido, acumular y retornar lista a RRHH
9. Evaluar gate de email verificado en login (no bloquear, advertir)

### SUPERADMIN (HAL-70..72)
10. seed-superadmin-owner.js: agregar validacion de complejidad de password (min 10 chars, alfanumerico)
11. Documentar que pg.Client raw es intencional (seed pre-Prisma bootstrap)
12. Agregar idempotencia en merge configuracion: JSON deep merge en vez de OR

### Reportes (HAL-80..81)
13. Deprecar /api/pagos/banco/* con comentario y redirect a /api/reportes/banco/*
14. Agregar gate plan capability a reporte de asistencia

## Gate

- Parametros 2025 disponibles
- PayPhone health check loguea estado al arranque
- Purga de comunicaciones en cron
- Seed con validacion de password
- Tests existentes PASS

## Commit

phase: AISK26-09 task: legal-pagos-email
