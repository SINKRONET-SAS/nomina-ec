# Fase 32 - Zonas, jornadas y calendarios

Ejecutar solo con aprobación explícita.

## Contexto obligatorio

- Leer `RULES.md`.
- Leer `.vscode/AuditLock.json`.
- Confirmar fase 31 firmada.

## Objetivo

Parametrizar reglas de asistencia: zonas, geocercas, jornadas, turnos, calendarios, feriados, tolerancias y excepciones.

## Alcance

- Crear zonas con coordenadas, radio, precisión mínima y estado.
- Crear jornadas ordinarias, parciales, rotativas, nocturnas, especiales y teletrabajo.
- Crear calendarios con feriados nacionales, locales y empresariales.
- Definir tolerancias, descansos, atrasos, salida temprana y horas extra.
- Integrar con marcaciones móviles.

## Validaciones

- Tests de geocerca y Haversine.
- Tests de jornada y feriados.
- Smoke de marcación móvil con zona configurada.
- AuditLock firmado.
