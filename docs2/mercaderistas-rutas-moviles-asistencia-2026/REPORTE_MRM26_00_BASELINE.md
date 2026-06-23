# Reporte MRM26-00 - Baseline documental

## Resultado

MRM26-00 queda desplegada documentalmente. No se modifico runtime, base de datos, backend, frontend, Expo ni seeds.

## Requerimiento interpretado

El caso de mercaderistas exige que la app soporte trabajadores que visitan varios sitios en un mismo dia. La zona fija de una unidad organizativa no basta para este perfil. Se requiere un modelo de ruta diaria con multiples paradas, sin perder la jornada laboral usada por nomina.

## Decisiones de baseline

- Crear plan Haiky independiente para rutas moviles y visitas: `HAIKY-MERCADERISTAS-RUTAS-MOVILES-ASISTENCIA-2026`.
- Usar codigo `MRM26`.
- Mantener asistencia y ruta como dominios separados.
- Exigir periodo operacional en rutas y visitas.
- Tratar GPS/foto/QR como evidencia configurable y sensible.
- Bloquear estados incoherentes: doble visita abierta y cierre de jornada con visita abierta.
- Proponer PWA para supervisor y app movil para mercaderista.

## Archivos generados

- `docs2/PLAN_HAIKY_MERCADERISTAS_RUTAS_MOVILES_ASISTENCIA_2026.md`
- `docs2/mercaderistas-rutas-moviles-asistencia-2026/MATRIZ_MRM26_REQUERIMIENTOS.md`
- `docs2/mercaderistas-rutas-moviles-asistencia-2026/CONTRATO_MRM26_RUTAS_VISITAS_MERCADERISTAS.md`
- `docs2/mercaderistas-rutas-moviles-asistencia-2026/RUNBOOK_MRM26_OPERACION_MOVIL.md`
- `.github/prompts/MERCADERISTAS-RUTAS-MOVILES-ASISTENCIA-2026-{00..08}-*.md`
- `CODEX_CONTEXT.md`
- `.vscode/AuditLock.json`

## Gates ejecutados

- Lectura de `RULES.md`.
- Lectura de `CODEX_CONTEXT.md`.
- Lectura de `.vscode/AuditLock.json`.
- Hash previo de AuditLock calculado.
- Artefactos generados en formato documental.

## Pendiente

- MRM26-01 debe diagnosticar el runtime real antes de cualquier migracion o cambio de app.
- Se requiere aprobacion explicita de fase antes de tocar schema, servicios, PWA o app movil.
