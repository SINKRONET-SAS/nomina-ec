# Fase 30 - Tipos de novedades configurables

Ejecutar solo con aprobación explícita.

## Contexto obligatorio

- Leer `RULES.md`.
- Leer `.vscode/AuditLock.json`.
- Confirmar fase 29 firmada.

## Objetivo

Permitir que cada tenant configure tipos de novedades y su impacto en nómina, legal, bancos y aprobaciones.

## Alcance

- Crear catálogo base y catálogo por tenant.
- Definir impacto: ingreso, descuento, ausencia, permiso, préstamo, anticipo, ajuste, hora extra, feriado, incapacidad y comisión.
- Definir flags de afectación: IESS, IR, décimos, vacaciones, provisiones y banco.
- Definir evidencia obligatoria y flujo de aprobación.
- Integrar catálogo con motor de nómina y UI de novedades.

## Validaciones

- Tests de impacto por tipo de novedad.
- Tests de aprobación por rol.
- Smoke de creación y uso de novedad en nómina.
- AuditLock firmado.
