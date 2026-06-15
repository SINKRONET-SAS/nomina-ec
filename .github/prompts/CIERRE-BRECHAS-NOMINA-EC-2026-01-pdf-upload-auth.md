# CBN26-01 - Contrato PDF UploadFile y auth real

Actua bajo `RULES.md`.

Objetivo: corregir el flujo de generacion/almacenamiento de rol de pagos PDF para que no envie `Blob` crudo donde se espera base64 y no use `base44.auth.getToken?.()`.

Contexto obligatorio:
- Leer `docs/PLAN_HAIKY_CIERRE_BRECHAS_NOMINA_EC_DIAGNOSTICO_2026.md`.
- Mapear `generarRolPagos.js`, servicios PDF, cliente API/auth real y usos de `UploadFile`.

Tareas:
- Confirmar contrato esperado por `UploadFile`.
- Convertir PDF a base64 o adaptar el contrato de carga de forma compatible.
- Reemplazar token Base44 inexistente por el mecanismo real de auth del proyecto.
- Exponer errores con `code`, `statusCode`, `correlationId` y mensaje seguro.
- Crear `docs/REPORTE_CBN26_01_PDF_UPLOAD_AUTH.md`.

Validaciones:
- `node --check` en archivos JS tocados.
- Prueba manual o automatizada del payload PDF.
- Backend/frontend tests o build si aplica.

No hacer:
- No cambiar calculo de nomina ni UI de beneficios.
