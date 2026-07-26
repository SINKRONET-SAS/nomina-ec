# PROMPT FASE DIUX26-03: DEPURACIÓN DE BUGS, ZERO SILENT FAILURES Y LOGS ESTRUCTURADOS

## Contexto y Alcance
Eliminación estricta de fallos silenciosos y manejo estructurado de errores en el backend conforme a la Regla Haiky #2.

## Criterios de Aceptación
1. Cero bloques `catch` vacíos en controladores y servicios de `backend/src`.
2. Todos los errores de infraestructura y negocio emiten `console.error` o lanzan `AppError` con `code`, `statusCode`, `correlationId` y `tenantId`.
3. Manejo de resiliencia en scripts de pre-test cuando faltan compiladores nativos.
4. Verificación de pruebas unitarias en Jest (`npm run test:backend`).
