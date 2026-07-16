# LRP26-01 - Backend: servicio de logo y cabecera PDF compartida

## Objetivo
Crear el servicio de logo del tenant y la utilidad compartida de cabecera PDF.

## Tareas
1. Crear `backend/src/services/tenantLogoService.js`:
   - `uploadTenantLogo(tenantId, dataUrl)`: valida PNG/JPEG, max 2MB, almacena en `tenant.configuracion.logoBase64`.
   - `removeTenantLogo(tenantId)`: elimina logoBase64 del JSON.
   - `getTenantLogoBase64(tenantId)`: devuelve el data URL o null.
2. Crear `backend/src/services/pdfBrandHeader.js`:
   - `resolveCompanyData(tenantOrRow)`: extrae RUC, razon social, representante legal, logo desde configuracion.
   - `buildPdfHeader({ title, company, period, isDraft })`: retorna contenido pdfmake con logo + titulo.
   - `buildSignatureBlock({ company, employeeName, employeeCedula })`: retorna firma con representante legal desde config.
3. Agregar endpoint `PUT /api/configuracion/logo` y `DELETE /api/configuracion/logo` en `app.js`.
4. Agregar handlers `uploadLogo` y `removeLogo` en `configurationController.js`.

## Gates
- `node --check` en tenantLogoService.js, pdfBrandHeader.js, configurationController.js, app.js.

## Reglas
- No migrar esquema Prisma; usar campo JSON existente `configuracion`.
- Validar binario (magic bytes PNG/JPEG), no solo MIME.
