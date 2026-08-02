# PLAN HAIKY: Auditoría Integral V75 — Corrección y mejora 2026

| Campo | Valor |
|---|---|
| Código | `AIV75-26` |
| Estado | `baseline-completed; ejecución pendiente de aprobación por fase` |
| Fecha | `2026-08-02` |
| Repositorio objetivo | `SINKRONET-SAS/nomina-ec` |
| Baseline | `32293c537b3bb52bbf0759511ed8a19d36a83eb8` (`main`, alineado con `origin/main`) |
| Fuente de auditoría | `AuditoriaIntegral2026V75.jsx` y `v75/v75data.jsx` del repositorio técnico `sinkroniq-cloud-flow` |
| Reglas | `RULES.md` |
| Contexto | `.github/CODEX_CONTEXT.md` |
| AuditLock | `.vscode/AuditLock.json` |
| Prompts | `.github/prompts/AIV75-26-00` a `.github/prompts/AIV75-26-04` |

## 1. Decisión

Desplegar un plan correctivo trazable para los tres puntos levantados por V75 sin copiar scripts de propuesta como si fueran compatibles con el runtime actual. La evidencia ejecutable del repositorio objetivo prevalece sobre el diagnóstico externo.

La fase `AIV75-26-00` queda autorizada por la solicitud de despliegue documental y se limita a gobierno, reconciliación y baseline. Las fases de producto `01` a `04` requieren aprobación explícita y deben ejecutarse en orden, con `AuditLock` firmado al cierre de cada una.

## 2. Reconciliación de hallazgos

| ID V75 | Clasificación al 2026-08-02 | Evidencia del repositorio objetivo | Decisión |
|---|---|---|---|
| `HAL-01` | **Verificado con alcance** | `backend/src/services/fiscalInvoiceService.js` ya implementa `retryPendingInvoices`; `backend/src/config/cron-jobs.js` lo agenda. Sin embargo, `render.yaml` excluye expresamente el worker cron del blueprint productivo inicial. | No aplicar `FIX_V75_01`. Extraer un ejecutor fiscal de una sola corrida y desplegarlo como cron aislado, sin reactivar el cron general que también calcula nómina. |
| `HAL-02` | **Falso positivo para disponibilidad** | Existe `backend/scripts/seed-superadmin-owner.js`, se invoca con `npm run seed:admins` desde `render.yaml` y usa UPSERT lógico por email/tenant. El acceso `superadmin` tiene una política intencional distinta de verificación de correo. | No crear un segundo seed ni aplicar `FIX_V75_02`. Agregar pruebas y documentar la política; endurecer credenciales solo si la fase confirma brecha vigente. |
| `B-01` | **Comprobado** | `frontend-web/src/pages/Nomina/DescargarReportes.jsx`, función `validarSae`, contiene dos llamadas consecutivas a `setError(nextError)`. | Eliminar únicamente la asignación duplicada y validar build/flujo SAE. |

## 3. Hallazgo material adicional derivado de la reconciliación

La lógica de reintento fiscal está implementada pero no tiene evidencia de ejecución en el despliegue descrito por `render.yaml`. Reintroducir `backend/src/config/cron-jobs.js` completo contradiría el cierre `CPD26`, porque ese proceso también contiene cálculo automático de nómina y otras tareas no aprobadas para producción inicial.

La solución objetivo es un **cron fiscal de propósito único**:

`Render cron aislado → script one-shot → retryPendingInvoices() → PostgreSQL / facturador → salida con código y correlationId`

El proceso debe terminar después de una corrida, no montar disco, no generar documentos y no ejecutar nómina. Render admite servicios `type: cron` con `schedule` y comando versionados en `render.yaml`; sus horarios se normalizan a UTC. Fuentes verificadas el 2026-08-02:

- https://render.com/docs/blueprint-spec
- https://render.com/articles/how-render-handles-scheduled-tasks

## 4. Alcance y no alcance

### Incluido

- reconciliar los hallazgos contra código y despliegue reales;
- prueba unitaria del reintento fiscal, límites, backoff, idempotencia y manejo de errores;
- ejecutor fiscal de una sola corrida y cron Render aislado;
- protección contractual para impedir que el cron fiscal ejecute cálculo de nómina;
- verificación del seed existente, idempotencia, variables obligatorias y política de acceso;
- corrección mínima de `B-01`;
- build PWA, suites backend, Prisma, contratos, UTF-8 y `git diff --check`.

### Excluido

- aplicar directamente los scripts incluidos en `v75data.jsx`;
- reactivar el worker cron general eliminado por `CPD26`;
- cambiar contratos públicos de facturación o estados persistidos sin migración compatible;
- crear otro usuario fundador o almacenar credenciales en el repositorio;
- modificar cálculo de nómina, documentos o almacenamiento persistente;
- declarar éxito operacional del cron sin evidencia de despliegue y al menos una corrida observable.

## 5. Fases y puertas

| Fase | Objetivo | Estado inicial | Puerta de salida |
|---|---|---|---|
| `AIV75-26-00` | Gobierno, baseline y reconciliación | `completed-pass` | Plan, contexto, prompts y AuditLock; evidencia fechada y sin falsos positivos. |
| `AIV75-26-01` | Contrato y pruebas del reintento fiscal | `pending-approval` | Tests cubren selección elegible, máximo de intentos, backoff, aislamiento por fila, logs y ejecución no configurada. |
| `AIV75-26-02` | Ejecutor one-shot y cron Render aislado | `pending-approval` | Blueprint válido; solo ejecuta facturación; no usa disco ni llama al cron general; rollback documentado. |
| `AIV75-26-03` | Seed existente y limpieza PWA | `pending-approval` | Seed idempotente verificado sin secretos; `B-01` corregido; build PWA PASS. |
| `AIV75-26-04` | Regresión integral y cierre | `pending-approval` | Backend, Prisma, contratos, build web, mobile gate, UTF-8, diff y AuditLock PASS; evidencia operacional separada de evidencia local. |

## 6. Contratos de implementación

### 6.1 Reintento fiscal

- Reutilizar `retryPendingInvoices`; no introducir `listarPendientes` o `emitirParaTransaccion` inexistentes.
- Mantener máximo de intentos, backoff y límite por corrida configurables o explícitos.
- Una factura fallida no debe detener las demás; cada error incluye `code`, `statusCode`, `correlationId`, `userId` y referencia no sensible.
- La ejecución debe ser idempotente frente a concurrencia y reintentos de la plataforma.
- El script one-shot debe devolver exit code distinto de cero ante fallo de infraestructura de la corrida; los fallos de negocio por factura quedan trazados individualmente.
- El cron se programa en UTC y el documento operativo muestra su equivalencia para `America/Guayaquil`.

### 6.2 Seed SUPERADMIN

- Conservar `backend/scripts/seed-superadmin-owner.js` como única fuente de seed administrativo.
- Verificar que una segunda ejecución actualiza el mismo usuario y no crea duplicados.
- No imprimir, versionar ni reutilizar contraseñas.
- Documentar expresamente si `superadmin` queda exceptuado de verificación de correo y cubrir la decisión con test.
- Cualquier endurecimiento de contraseña debe ser compatible con variables productivas y contar con mensaje de migración claro.

### 6.3 PWA SAE

- Eliminar solo la segunda llamada consecutiva a `setError(nextError)`.
- No cambiar el mensaje visible, el contrato `/reportes/sae/precheck` ni el estado `saePrecheck`.
- Validar que el error se muestre una vez y que el botón salga de estado de carga.

## 7. Matriz de evidencia

| ID | Afirmación | Estado | Evidencia | Confianza | Acción |
|---|---|---|---|---|---|
| `EV-01` | Existe lógica automática de reintento fiscal. | Comprobado | `backend/src/services/fiscalInvoiceService.js` | Alta | Mantener y probar. |
| `EV-02` | El cron general agenda el reintento fiscal. | Comprobado | `backend/src/config/cron-jobs.js` | Alta | No desplegar completo. |
| `EV-03` | El blueprint productivo no ejecuta el cron general. | Comprobado | `render.yaml` y plan `CPD26` | Alta | Crear cron fiscal aislado. |
| `EV-04` | Existe seed idempotente de SUPERADMIN. | Comprobado con alcance | `backend/scripts/seed-superadmin-owner.js`, `backend/package.json`, `render.yaml` | Alta | Probar y documentar; no duplicar. |
| `EV-05` | El seed garantiza correo verificado. | No confirmado / política distinta | El seed no escribe `email_verificado_en`; middleware conserva excepción de rol. | Alta | Documentar y cubrir política, sin asumir defecto de acceso. |
| `EV-06` | Existe una asignación duplicada en `validarSae`. | Comprobado | `frontend-web/src/pages/Nomina/DescargarReportes.jsx` | Alta | Corrección mínima en fase 03. |
| `EV-07` | El cron aislado quedará operativo en Render. | Objetivo | Requiere cambio, despliegue y evidencia de corrida. | Baja hasta despliegue | No declarar logrado con pruebas locales. |

## 8. Supuestos y dependencias

| ID | Tipo | Registro |
|---|---|---|
| `SUP-01` | Supuesto | Render continúa siendo el despliegue objetivo gobernado por `render.yaml`. |
| `SUP-02` | Dependencia | El cron fiscal recibirá `DATABASE_URL` y credenciales del facturador por variables seguras; no se comparten automáticamente entre servicios. |
| `SUP-03` | Dependencia | La aprobación de costo y frecuencia del cron corresponde al responsable del entorno. |
| `SUP-04` | Riesgo | Cambiar estados elegibles puede reemitir comprobantes; se exige idempotencia y tests antes del blueprint. |
| `SUP-05` | Riesgo | Reutilizar el cron general reactivaría cálculo de nómina y rompería la decisión `CPD26`. |

## 9. Validación y rollback

Validación final mínima:

```powershell
npm.cmd run contracts
npm.cmd --workspace=backend run prisma:validate
npm.cmd --workspace=backend test -- --runInBand
npm.cmd --workspace=frontend-web run build
npm.cmd --workspace=app-movil run check:stores
git diff --check
```

Rollback de producto:

1. suspender o retirar solo el servicio cron fiscal del blueprint;
2. revertir el script one-shot y sus pruebas sin tocar `fiscalInvoiceService` público;
3. conservar el reintento manual de la consola como contingencia;
4. revertir la línea de limpieza PWA si apareciera una diferencia funcional inesperada;
5. restaurar el `AuditLock` anterior y registrar el motivo; nunca borrar evidencia.

## 10. Criterio de cierre

El plan solo puede marcarse `completed-pass` cuando:

- `HAL-01` tenga pruebas locales y evidencia de una corrida del cron desplegado;
- `HAL-02` quede cerrado con prueba del seed vigente y política de verificación documentada;
- `B-01` esté corregido y la PWA compile;
- no se reactive el cron general ni se introduzcan cambios de nómina/documentos;
- todas las validaciones reales consten en `CODEX_CONTEXT.md` y `.vscode/AuditLock.json`;
- el commit use `phase: AIV75-26-XX task: ...`.

## 11. Evidencia de despliegue documental AIV75-26-00

Resultado local del 2026-08-02:

- contratos del sistema: PASS;
- Prisma schema validate: PASS;
- suites enfocadas `fiscalInvoiceService.test.js` y `app.routes.test.js`: PASS, 2 suites y 38 pruebas;
- build PWA con Vite `--configLoader runner`: PASS, 2.031 módulos, `dist/sw.js` generado;
- gate móvil de tiendas: PASS;
- no se modificaron archivos de runtime;
- la suite backend completa en modo serial no concluyó dentro de los límites del entorno; el intento paralelo con permisos ampliados no fue autorizado. Esta limitación queda registrada y no se transforma en un PASS ficticio.

La fase `AIV75-26-00` puede cerrarse porque su alcance es exclusivamente documental y las superficies relevantes tuvieron pruebas enfocadas, build y contratos verdes. El backend completo vuelve a ser obligatorio en `AIV75-26-04` cuando existan cambios de producto.
