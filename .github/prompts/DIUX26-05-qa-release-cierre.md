# PROMPT FASE DIUX26-05: QA INTEGRAL, REGRESIÓN E2E Y CIERRE DE GOBIERNO (AUDITLOCK)

## Contexto y Alcance
Fase final de control de calidad y congelamiento de gobierno. Ejecución de la suite completa de pruebas, verificación de contratos, validación Prisma y actualización firmada de `AuditLock.json`.

## Criterios de Aceptación
1. Contratos de sistema verificados: `npm run contracts` PASS.
2. Esquema Prisma validado: `npx prisma validate` PASS.
3. Suite de backend limpia: `npm run test:backend` PASS.
4. Verificación de archivos UTF-8 sin BOM ni mojibake.
5. Firma final SHA256 registrada en `.vscode/AuditLock.json` y `AuditLock.json` con estado `closed` / `completed-pass`.
