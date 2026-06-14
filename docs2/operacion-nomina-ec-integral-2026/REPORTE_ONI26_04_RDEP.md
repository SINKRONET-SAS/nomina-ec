# Reporte ONI26-04 - RDEP XSD XML

## Resultado

Fase cerrada documentalmente con fuente XSD versionada, manifiesto de evidencia, contrato RDEP y XML DEMO. Se corrige el criterio funcional: para nomina aplica RDEP y no ATS.

## Entregables

- `backend/src/config/rdep/Esquema_RDEP_2023.xsd`
- `backend/src/config/rdep/rdep-source-manifest.json`
- `backend/src/config/rdep/rdep-demo-2023.xml`
- `docs2/operacion-nomina-ec-integral-2026/CONTRATO_ONI26_04_RDEP.md`

## Validaciones

- Hash SHA256 del XSD versionado calculado y registrado.
- Fuentes adjuntas referenciadas por hash para trazabilidad.
- XML DEMO creado con datos ficticios.
- Bloqueo de validacion XSD productiva documentado por falta de validador local y por diferencia de fuentes 2023/2024.

## Riesgo residual

No se declara cumplimiento tributario total. Antes de release se debe reconciliar XSD, catalogo y resolucion vigente del SRI para el ejercicio fiscal objetivo, y ejecutar validacion XSD automatizada.
