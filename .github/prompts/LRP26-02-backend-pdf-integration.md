# LRP26-02 - Backend: integrar logo y firma en todos los PDFs

## Objetivo
Modificar los 4 servicios de generacion PDF para usar la cabecera con logo y la firma desde datos de empresa.

## Tareas
1. `payrollRolePdfService.js`:
   - Importar `resolveCompanyData`, `buildPdfHeader`, `buildSignatureBlock`.
   - Reemplazar cabecera manual por `buildPdfHeader()` en rol individual y transpuesto.
   - Reemplazar firma manual por `buildSignatureBlock()`.
   - Eliminar "Plantilla rol_pago_sknomina vX" del footer, dejar solo "Documento generado con SKNOMINA".
2. `templateGenerator.js`:
   - Agregar `logoBase64` al contexto del contrato.
   - Cabecera con logo en `buildContractDocDefinition()`.
   - Cabecera con logo en `buildFiniquitoDocDefinition()`.
   - Firma del finiquito usa `representanteLegal`, `representanteLegalCargo`, `representanteLegalIdentificacion`.
   - Footer: "Documento generado con SKNOMINA."
3. `equipmentDeliveryActService.js`:
   - Leer `logoBase64` de `configuracion` del tenant.
   - Cabecera con logo en `buildActPdf()`.
   - Footer: "Documento generado con SKNOMINA."
4. `payrollReportService.js`:
   - Ampliar `getTenant()` para incluir `configuracion`.
   - Cabecera con logo en `buildSummaryPdf()`.
   - Footer: "Documento generado con SKNOMINA."

## Gates
- `node --check` en los 4 servicios PDF.
- Los footers no contienen "Plantilla" ni version interna.

## Reglas
- No agregar comentarios bibliograficos ni metadata de proceso que invalide el reporte.
- El pie de firma siempre refleja datos de empresa, no valores quemados.
