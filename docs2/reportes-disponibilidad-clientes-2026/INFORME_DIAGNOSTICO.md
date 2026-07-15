# Informe diagnostico HRD26 - reportes y disponibilidad de clientes

Generado: 2026-07-15T01:34:11.667Z
Hash evidencia: 11ffe403d1129514566c3976053258f4d5ff0bc02f32e31091a2a1b24fabd708

## Alcance

- LANDING: promesa comercial de reportes, planes y no regresion de IESS TXT.
- PWA: reportes internos, filtros global/individual, exporte mensual y acumulado anual.
- BACKEND: tipos de reporte, endpoints y generacion XLSX/CSV/PDF soportada.
- MOBILE: rol de pago individual y PDF disponible desde autoservicio.

## Fuentes legales 2026 reconfirmadas

- SRI impuesto a la renta personas naturales: https://www.sri.gob.ec/impuesto-renta. El SRI publica la base imponible de relacion de dependencia como ingreso gravado menos aporte personal IESS, y enlaza tablas de cada ejercicio fiscal.
- SRI tablas IR 2026: https://www.sri.gob.ec/o/sri-portlet-biblioteca-alfresco-internet/descargar/58a7f4f6-ab51-48b6-b9ff-a8e97e1a28ef/Tablas%20de%20c%C3%A1lculo%20de%20Impuesto%20a%20la%20Renta.pdf. Resolucion NAC-DGERCGC25-00000043: tabla 2026 inicia con fraccion basica USD 12.208 y tarifa 0%.
- Ministerio del Trabajo - sistema salarial: https://salarios.trabajo.gob.ec/. Portal oficial usado como fuente operativa de salarios; el repo mantiene SBU 2026 USD 482 con sourceStatus validado.
- IESS empleador: https://www.iess.gob.ec/es/web/empleador/avisos-de-entrada-y-salida. Portal oficial IESS de empleador para avisos y novedades; el repo mantiene aportes 9.45% personal y 11.15% patronal con sourceStatus validado.

## Hallazgos confirmados

- Sin hallazgos abiertos despues de aplicar la matriz de novedades y filtros PWA.

## Controles de no regresion

- HRD26-BE-001: confirmado. payrollReportService expone PAYROLL_NOVELTY_MATRIX y arma columnas dinamicas desde lineas de calculo de novedades.
- HRD26-PWA-001: confirmado. DescargarReportes expone matriz de novedades, alcance global/individual, busqueda de empleado y acumulado anual.
- HRD26-BE-002: confirmado. Backend mantiene exporte mensual y consolidado anual por tipo de reporte.
- HRD26-MOB-001: confirmado. Mobile consume rol de pago mensual y PDF desde API gobernada por plan mobile.
- HRD26-LAND-001: confirmado. Landing comunica reportes internos, Batch IESS TXT y entrada a planes.
- HRD26-LEGAL-001: confirmado. Parametros Ecuador 2026 estan versionados como validado: SBU 482, IESS 9.45/11.15 y tabla IR 2026 SRI.
- HRD26-NOREG-001: confirmado. Contratos y prueba backend focalizada cubren la nueva matriz para reducir regresiones.

## Decision tecnica

- La matriz de novedades se separa de la matriz de conceptos: solo toma lineas de origen novedad o metadata de tipo novedad.
- El reporte mensual y el acumulado anual usan el mismo filtro sanitizado para mantener compatibilidad API.
- El alcance individual se resuelve por selector de empleado y no por escritura manual de IDs.
- La revision legal queda documentada como parametrizacion 2026 validada; futuras actualizaciones deben pasar por parametros legales versionados.
