# Reporte DCF26-06 - API v1 de integracion

## Resultado

DCF26-06 queda cerrada como fase runtime: la API externa dejo de ser promesa documental y quedo expuesta como `/api/v1`, con autenticacion por API key, scopes, rate limit, idempotencia para escrituras, auditoria y pantalla visible para crear clientes de integracion.

## Cambios funcionales

- Se agregaron tablas `api_clients` y `api_idempotency_keys` para credenciales por tenant y respuestas idempotentes.
- Se agrego autenticacion externa por `Authorization: Bearer` o `X-API-Key`, con hash SHA-256 y clientes activos.
- Se agregaron scopes versionados:
  - `employees.read`
  - `attendance.write`
  - `novelties.write`
  - `payroll.read`
- Se expusieron endpoints iniciales:
  - `GET /api/v1`
  - `GET /api/v1/employees`
  - `POST /api/v1/attendance/marks`
  - `POST /api/v1/novelties`
  - `GET /api/v1/payroll/:anio/:mes`
- Se agrego gestion de clientes API para OWNER/SUPERADMIN:
  - `GET /api/integraciones/clientes`
  - `POST /api/integraciones/clientes`
- La pantalla `OperacionIntegral` ahora muestra `Clientes API v1`, permite crear API keys, seleccionar scopes y listar clientes activos.

## Evidencia visible

En `frontend-web/src/pages/Operacion/OperacionIntegral.jsx` el modulo "API de integracion" ya no aparece bloqueado. La seccion `Clientes API v1` queda expuesta en la misma pantalla con:

- Formulario de nombre del cliente.
- Checkboxes de scopes.
- Boton `Crear cliente API`.
- Visualizacion de API key una sola vez.
- Listado de clientes activos y rate limit.

## Validaciones ejecutadas

- `npx.cmd prisma validate` en `backend`: PASS.
- `node --check src/app.js`: PASS.
- `node --check src/controllers/externalApiController.js`: PASS.
- `node --check src/controllers/integrationController.js`: PASS.
- `node --check src/routes/externalApiRoutes.js`: PASS.
- `node --check src/middleware/externalApiAuth.js`: PASS.
- `node --check src/middleware/externalApiIdempotency.js`: PASS.
- `npm.cmd test -- externalApiAuth.test.js externalApiIdempotency.test.js integrationController.test.js --runInBand`: PASS, 3 suites, 14 tests.
- `npm.cmd run build` en `frontend-web`: PASS.
- `git diff --check`: PASS, solo avisos CRLF esperados en Windows.

## Riesgos residuales

- La migracion debe aplicarse en cada ambiente antes de usar la API.
- El rate limit inicial es en memoria; para despliegues multi-instancia debe moverse a almacenamiento compartido.
- Los contratos externos requieren documentacion de consumo y ejemplos por sistema integrador antes de exponerlos comercialmente.
