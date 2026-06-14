# Runbook ONI26 - QA E2E y Release

## Gates P0

- Sitio publico: inicio, link publico y crear cuenta operan sin datos reales.
- Parametrizacion: parametros legales, contables, bancos, usuarios y roles visibles.
- RDEP: ficha tecnica, catalogo, XSD y fuente SRI reconciliados antes de produccion.
- API: cerrada hasta autenticacion, rate limits, scopes e idempotencia.
- Asistencia: permisos GPS/camara con errores visibles.
- Nomina: apertura, novedades, calculo, cierre, reportes y bancos con empresa DEMO.
- LOPDP: no cachear datos personales innecesarios y registrar consentimientos.

## Smoke DEMO

1. Crear tenant DEMO.
2. Cargar seed DEMO.
3. Abrir periodo.
4. Cargar lote de novedades.
5. Calcular nomina.
6. Generar reporte tabular.
7. Generar archivo bancario DEMO.
8. Ejecutar precheck RDEP.
9. Revisar dashboard/headcount.
10. Verificar auditoria con `correlationId`.

## Rollback

- Revertir release por commit/tag.
- Desactivar API externa.
- Anular archivos bancarios por version logica.
- Reabrir periodo solo con permiso, motivo y auditoria.
- Eliminar seed solo si `environment=demo`.
