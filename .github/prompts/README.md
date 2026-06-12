# Prompts HAIKY por fase - Nómina-Ec

Estos prompts ejecutan los planes ubicados en `docs2` sobre el stack real del repositorio: Express, PostgreSQL, Prisma, React, Expo y Render.

## Reglas

1. Leer `RULES.md`.
2. Leer `.vscode/AuditLock.json`.
3. No iniciar una fase si la anterior no está firmada.
4. Ejecutar solo la fase aprobada.
5. Actualizar `AuditLock.json` al cerrar cada fase.
6. Validar UTF-8 sin BOM.
7. Commit con `phase: <X>` y `task: <Y.Z>`.

## Fases de cierre residual

- Fase 17: validación legal Ecuador 2026.
- Fase 18: migración AWS SDK v2 a v3.
- Fase 19: prueba RLS en Render con usuario no superusuario.

## Fases comerciales y experiencia pública

- Fase 20: renombre de producto a `Nómina-Ec`.
- Fase 21: landing pública.
- Fase 22: PWA.
- Fase 23: auth backend, registro y recuperación.
- Fase 24: auth PWA y app móvil.
- Fase 25: planes y suscripciones.
- Fase 26: PayPhone como canal de pago.
- Fase 27: legal, QA comercial y Render.

## Fases de parametrización productizable

- Fase 28: núcleo de parametrización.
- Fase 29: parámetros legales versionados.
- Fase 30: tipos de novedades configurables.
- Fase 31: estructura organizativa y centros de costo.
- Fase 32: zonas, jornadas y calendarios.
- Fase 33: onboarding operativo del OWNER.
- Fase 34: QA end-to-end productizable.
