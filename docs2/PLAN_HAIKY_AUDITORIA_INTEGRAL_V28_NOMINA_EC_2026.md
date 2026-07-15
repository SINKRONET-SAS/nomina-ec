# Plan Haiky - AUDITORIA INTEGRAL V28 NOMINA EC 2026

## Identificacion

| Campo | Valor |
|-------|-------|
| Codigo | AIV28 |
| Plan | HAIKY-AUDITORIA-INTEGRAL-V28-NOMINA-EC-2026 |
| Fecha | 2026-07-14 |
| Superficie | LANDING, PWA, BACKEND, MOBILE |
| Diagnostico | `docs2/auditoria-integral-v28-nomina-ec-2026/INFORME_DIAGNOSTICO.md` |
| JSON | `docs2/auditoria-integral-v28-nomina-ec-2026/DIAGNOSTICO_JSON.json` |
| Prompts | `.github/promts/AIV28-{00..05}-*.md` |
| AuditLock | `.vscode/AuditLock.json` |

## Alcance

Auditoria integral a toda la funcionalidad: LANDING, PWA, BACKEND y MOBILE. Incluye mejora del motor de calculo de nomina, verificacion de cumplimiento legal Ecuador 2026 (laboral y tributario), reconfirmacion de hallazgos para evitar falsos positivos, scripts de solucion en JS y evaluacion de migracion a Python.

## Hallazgos reales (7)

| ID | Sev. | Fase | Descripcion |
|----|------|------|-------------|
| H-01 | MEDIO | AIV28-01 | Fallas silenciosas en batch de nomina |
| H-02 | MEDIO | AIV28-01 | Sin validacion para dias=0 |
| H-05 | MEDIO | AIV28-02 | Rate limiting solo en memoria |
| H-11 | ALTO | AIV28-04 | SQLite mobile sin cifrado |
| H-12 | MEDIO | AIV28-04 | Upload base64 imagen en RAM |
| H-06 | BAJO | AIV28-02 | Sin validacion centralizada (diferido) |
| H-13 | BAJO | AIV28-04 | GPS sin validacion rango (diferido) |

## Falsos positivos descartados (4)

- H-03: Precision monetaria (roundMoney correcto)
- H-04: Integridad de totales (assertPayrollTotalsIntegrity presente)
- H-07: User.tenantId nullable (intencional para superadmin)
- H-08: Webhook sin firma (ya verifica HMAC-SHA256)

## Fases

### AIV28-00 - Diagnostico integral
- Escaneo automatizado de las 4 superficies.
- Reconfirmacion de hallazgos contra codigo fuente.
- Verificacion de parametros legales Ecuador 2026 contra fuentes oficiales.
- Generacion de informe diagnostico y JSON.
- Evaluacion de migracion a Python (resultado: NO RECOMENDADO).

### AIV28-01 - Motor de calculo: validaciones y batch
- H-01: Implementar estado `partial_failed` en batch cuando hay errores individuales.
- H-02: Validar `diasTrabajados > 0` antes del calculo; excluir con log informativo.
- Agregar tests para ambos escenarios.
- Verificar que no hay regresion en suite existente.

### AIV28-02 - Seguridad backend
- H-05: Documentar limitacion de rate limiting in-memory; agregar TODO con referencia a Redis cuando se escale.
- H-06: Documentar decision de validacion manual actual; diferir adopcion de Zod.
- Verificar que no hay endpoints sin autenticacion.
- Verificar idempotencia en endpoints de pago.

### AIV28-03 - PWA y Landing: calidad
- Confirmar que tokens en localStorage tienen mitigacion adecuada (CSP, auto-logout).
- Verificar que console.error son solo logs de error, no debug.
- Verificar accesibilidad basica (alt, aria, semantica).
- Verificar build produccion sin errores.

### AIV28-04 - Mobile: seguridad y uploads
- H-11: Implementar cifrado de payloads JSON con expo-crypto antes de escribir a SQLite.
- H-12: Migrar upload de permisos de base64 a FormData multipart.
- H-13: Agregar validacion de rango lat/lng en OperacionMovilScreen.
- Verificar compatibilidad Expo SDK 57.

### AIV28-05 - Gobierno y QA release
- Actualizar CODEX_CONTEXT.md con decisiones AIV28.
- Actualizar AuditLock.json con evidencia.
- Ejecutar suite backend completa.
- Ejecutar build PWA.
- Verificar Prisma validate.
- Verificar mobile store readiness.
- Commit y push.

## Decisiones

1. NO se migra a Python. El motor Node.js esta legalmente validado, en produccion y con cobertura de tests.
2. Los hallazgos bajos (H-06, H-13) se difieren a fase futura por bajo impacto.
3. H-05 (rate limiting) se documenta pero no se migra a Redis hasta que haya multi-instancia.
4. H-09 (localStorage tokens) es riesgo aceptado con mitigaciones existentes.
5. Los falsos positivos se documentan para evitar reportarlos en futuras auditorias.
