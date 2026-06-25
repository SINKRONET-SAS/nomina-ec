# Reporte ANV1-01..08 - Cierre runtime local

Fecha: 2026-06-25  
Estado: in_validation

## Cambios ejecutados

- `CODEX_CONTEXT.md` se movio de raiz a `.github/CODEX_CONTEXT.md`.
- PayPhone fue revisado contra `C:\proyectos web\sinkroniq-mobile` y se adopto el patron minimo seguro: `Prepare`, `Confirm`, referencia unica, callback backend HTTPS, monto verificado y bloqueo si mock/config incompleta.
- Gestion de planes versiona cambios cuando existen suscripciones activas.
- Nomina ahora incluye IESS por afiliacion/tipo de relacion, limite semanal de horas extra y periodos explicitos de decimos.
- Lectura salarial queda protegida por rol y auditada para owner/admin_rrhh/superadmin; supervisor recibe campos sensibles redactados.
- LOPDP fue revisado contra `C:\proyectos web\sinkroniq-mobile` y se implemento: `consent_preferences`, API `/api/privacidad/*`, exportacion JSON auditada, retiro de opcionales, anonimizado superadmin y pantalla `/dashboard/privacidad`.
- Auditoria ahora sanitiza cedula, identificacion, sueldo, salario, remuneracion, gastos personales, cuentas, tokens y buffers.
- Se agrego `Superadmin.jsx` y ruta `/dashboard/superadmin`.
- Render/env activos usan nombres Nomina-Ec y variables PayPhone reales.

## Pruebas agregadas

- `payphoneGatewayService.test.js`
- `paymentController.test.js`
- `payrollNoveltyService.test.js`
- `auditService.test.js`
- `privacyConsentService.test.js`
- `userDataExportService.test.js`
- `userDataPurgeService.test.js`
- Nuevos casos en `calculoNominaService.test.js` y `empleadoController.test.js`

## Pendiente de gate

- `npm run contracts`
- `npm run prisma:validate`
- `npm run test:backend`
- `npm run build:web`
- `npm run check:mobile`

## Riesgos residuales

- PayPhone productivo requiere credenciales reales y `BACKEND_PUBLIC_URL` publico HTTPS.
- El retiro operativo de geolocalizacion movil requiere fase posterior que bloquee marcacion movil; hoy se conserva el snapshot de activacion existente.
- Renombre de DB/usuario en infraestructura existente debe hacerse con migracion y rollback si ya hay instancia Render productiva.
- Validacion legal/contable ecuatoriana final sigue requerida antes de oferta comercial.
