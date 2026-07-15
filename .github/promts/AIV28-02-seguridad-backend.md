# AIV28-02 - Seguridad backend

## Plan
HAIKY-AUDITORIA-INTEGRAL-V28-NOMINA-EC-2026

## Objetivo
Documentar decisiones sobre H-05 (rate limiting) y H-06 (validacion centralizada). Verificar que no hay endpoints sin autenticacion ni vulnerabilidades abiertas.

## Tareas

1. **H-05**: En `backend/src/middleware/rateLimit.js`:
   - Agregar comentario documentando la limitacion in-memory.
   - Agregar referencia a Redis store como mejora futura.
   - Verificar que los limites actuales (10 req/15min auth, 120 req/60s API) son razonables.

2. **H-06**: Documentar decision de validacion manual:
   - Agregar comentario en README o CODEX_CONTEXT que la validacion centralizada (Zod/Joi) se difiere.
   - Verificar que los endpoints criticos (crear empleado, calcular nomina, pagos) validan input.

3. Verificar autenticacion en todos los endpoints:
   - Buscar rutas sin middleware `requireAuth` o `requireRole`.
   - Confirmar que rutas publicas son realmente publicas (login, register, landing, planes).

4. Verificar idempotencia en endpoints de pago:
   - Confirmar que `externalApiIdempotency` se aplica correctamente.

## Criterios de aceptacion

- Cero endpoints protegidos sin autenticacion.
- Documentacion de decisiones en codigo o CODEX.
- No se modifica logica de negocio.
- RULES.md: zero regresiones.

## Archivos afectados

- `backend/src/middleware/rateLimit.js` (comentarios)
- `backend/src/app.js` (verificacion de rutas)
