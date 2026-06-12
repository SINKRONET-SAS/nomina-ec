# Plan HAIKY - Landing, PWA, auth y PayPhone para Nómina-Ec

Fecha de plan: 2026-06-11  
Repositorio objetivo: `C:\proyectos web\nuevo_nomina`  
Referencia revisada: `C:\proyectos web\sinkroniq-mobile`  
Estado: plan documental, pendiente de ejecucion por fases segun `RULES.md`

## 1. Regla de alcance

Este plan no autoriza cambios runtime por si solo. Antes de ejecutar cualquier fase se debe leer `RULES.md`, validar `.vscode/AuditLock.json` y confirmar que la fase anterior este firmada. La fase 19 de RLS Render sigue pendiente; por tanto, estas fases quedan programadas despues del cierre de RLS o con aprobacion explicita del OWNER tecnico.

El nombre visible del sistema no debe ser `Plan Haiky` ni `Sistema de RRHH Ecuador`. El producto debe presentarse como `Nómina-Ec` en landing, PWA, app movil, documentos generados, metadata, logs visibles, titulos HTML y artefactos de marca. `Plan HAIKY` queda solo como metodologia interna de planificacion.

## 2. Hallazgos de `sinkroniq-mobile`

### Landing y PWA

- `landing` usa React + Vite + `vite-plugin-pwa`.
- La configuracion PWA esta separada en `landing/pwa.config.js`.
- El manifest define `name`, `short_name`, `description`, `start_url`, `scope`, `display`, `icons`, `screenshots` y `shortcuts`.
- `vite.config.js` usa proxy `/api` configurable por `VITE_PROXY_TARGET`.
- Hay paginas publicas de terminos y privacidad en `landing/public`.
- La landing consume planes publicos desde cliente API y tambien usa catalogos compartidos.

### Auth PWA y movil

- La landing separa `authClient.js` para `login`, `register`, verificacion de email, recuperacion y reset de password.
- La app movil separa `auth.api.js` y `AuthContext`, almacena tokens y expone login, registro, refresh, logout, verificacion y recuperacion.
- La API usada como contrato base es:
  - `POST /api/auth/login`
  - `POST /api/auth/register`
  - `POST /api/auth/refresh`
  - `POST /api/auth/logout`
  - `POST /api/auth/password/forgot`
  - `POST /api/auth/password/reset`
  - `POST /api/auth/email-verification/request`
  - `POST /api/auth/email-verification/confirm`
  - `POST /api/auth/email-verification/resend`
  - `GET /api/auth/email-verification/status`

### Planes, suscripciones y pagos

- Los planes publicos se desacoplan en catalogos compartidos.
- El frontend consulta planes mediante `/api/pagos/planes`.
- La gestion administrativa usa `/api/pagos/planes/admin`, `POST /api/pagos/planes`, `PUT /api/pagos/planes/:planId` y `DELETE /api/pagos/planes/:planId`.
- PayPhone se encapsula como proveedor visible al OWNER mediante `paymentMethods.api.js`.
- El flujo recomendado crea un `checkout-intent` y no expone secretos de proveedor al cliente.
- El backend de referencia tiene rutas para:
  - `POST /api/pagos/payment-methods/checkout-intent`
  - `GET /api/pagos/payment-methods`
  - `GET /api/pagos/payment-methods/capabilities`
  - `PATCH /api/pagos/payment-methods/:paymentMethodId/default`
  - `POST /api/pagos/payment-methods/:paymentMethodId/revoke`
  - `POST /api/pagos/webhook`
  - `GET /api/pagos/confirm`
  - `GET /api/pagos/checkout/payphone`
- Los montos se manejan en centavos y separan base imponible, base no gravada, IVA y total para PayPhone.

## 3. Brechas actuales en `nuevo_nomina`

- `frontend-web` solo tiene login basico y layout autenticado; no existe landing publica ni PWA.
- `app-movil` tiene login simple contra `/auth/login`, sin registro publico ni recuperacion de password.
- `backend` tiene `POST /api/auth/register` restringido a `superadmin` u `owner`; falta definir registro publico controlado para tenant/empresa.
- No existen planes comerciales, suscripciones, PayPhone, checkout ni catalogo publico de planes.
- Persisten cadenas visibles de marca antigua: `Plan Haiky`, `Sistema de RRHH Ecuador`, `plan-haiky-*` y textos de documentos generados.
- No existe manifest PWA, service worker, assets PWA ni shortcuts de instalacion.

## 4. Principios de adaptacion a Nómina-Ec

- La landing debe vender y explicar Nómina-Ec como SaaS de nomina ecuatoriana, no como facturador.
- Los planes deben modelarse por capacidades de RRHH: empleados activos, empresas/tenants, liquidaciones, archivos bancarios, documentos, reportes, soporte y automatizaciones.
- PayPhone debe usarse como canal de pago para suscripciones y add-ons, con confirmacion backend y evidencia auditable.
- Registro publico debe crear tenant en estado controlado: `PENDING_VERIFICATION`, `TRIAL` o `PENDING_PAYMENT`.
- PWA y app movil deben compartir contratos de API, mensajes en espanol y errores visibles.
- Las pantallas publicas deben respetar LOPDP Ecuador: terminos, privacidad, consentimiento, finalidad de tratamiento y politica de eliminacion/retencion.

## 5. Fases propuestas

### Fase 20: Renombre de producto a Nómina-Ec

Objetivo: eliminar la marca visible antigua antes de crear landing/PWA.

Alcance:

- Reemplazar textos visibles `Plan Haiky`, `Plan HAIKY`, `Sistema de RRHH Ecuador` por `Nómina-Ec` donde corresponda.
- Mantener `Plan HAIKY` solo en documentos de planificacion interna.
- Actualizar `frontend-web/index.html`, login, layout, app movil, footer de documentos, healthcheck visible y README publico.
- Definir nombres tecnicos npm sin romper scripts. Si se renombra `package.name`, hacerlo con lockfile coherente.
- Revisar bucket default y variables `AWS_S3_BUCKET` para evitar nueva infraestructura por accidente; documentar migracion si se cambia.

Validaciones:

- `rg` sin coincidencias visibles no justificadas.
- `npm run build` en frontend.
- `node --check` en backend modificado.
- Smoke de login web y movil.

### Fase 21: Landing publica Nómina-Ec

Objetivo: crear primera experiencia publica con contenido real de nomina Ecuador.

Alcance:

- Decidir si `frontend-web` incorpora rutas publicas o si se crea workspace `landing`.
- Crear rutas: `/`, `/precios`, `/privacidad`, `/terminos`, `/login`, `/registro`, `/recuperar-password`.
- Adaptar componentes desde `sinkroniq-mobile/landing` solo como patron, no como copia literal de dominio.
- Mostrar propuesta: nomina mensual, decimos, vacaciones, liquidaciones, archivos bancarios, documentos y auditoria.
- Incluir CTA a registro y demo.

Validaciones:

- Build Vite.
- Revision visual mobile/desktop.
- Textos sin marca antigua.

### Fase 22: PWA Nómina-Ec

Objetivo: habilitar instalacion web y comportamiento offline seguro.

Alcance:

- Integrar `vite-plugin-pwa`.
- Crear `pwa.config.js` con `name: Nómina-Ec`, `short_name: Nómina-Ec`, `lang: es-EC`.
- Agregar iconos, maskable icons, screenshots y shortcuts: Login, Registro, Panel, Privacidad.
- Configurar cache solo para shell y assets; API de nomina debe ser `NetworkOnly` salvo colas explicitamente aprobadas.
- Agregar proxy `/api` por `VITE_PROXY_TARGET`.

Validaciones:

- `npm run build`.
- Lighthouse/PWA checklist manual.
- Manifest valido y service worker sin cachear respuestas privadas sensibles.

### Fase 23: Auth backend, registro y recuperacion

Objetivo: preparar contratos seguros para PWA y app movil.

Alcance:

- Mantener `POST /api/auth/register` administrativo o crear ruta publica separada: `POST /api/auth/public-register`.
- Definir flujo de registro: empresa, RUC opcional, email OWNER, password, consentimiento, plan inicial.
- Crear tablas o columnas para email verification, password reset tokens, refresh tokens y sesiones.
- Implementar `forgot/reset` con tokens de un solo uso, expiracion, rate limit y auditoria.
- Agregar `correlationId`, logs en espanol y errores sin retornos silenciosos.

Validaciones:

- Tests de registro, login, refresh, logout, forgot/reset.
- Prueba de rate limit.
- Revision LOPDP de consentimiento y minimizacion.

### Fase 24: Auth PWA y app movil

Objetivo: llevar los contratos de auth a las dos interfaces.

Alcance:

- PWA: clientes `authClient`, almacenamiento de sesion, rutas publicas/privadas y formularios.
- Movil: extender `app-movil/src/services/api.js` o crear `auth.api.js` con login, registro, forgot/reset y refresh.
- Unificar mensajes: credenciales invalidas, correo no verificado, tenant suspendido, plan vencido.
- Evitar almacenar datos sensibles en `AsyncStorage`; usar almacenamiento seguro cuando aplique.

Validaciones:

- Tests unitarios de clientes API.
- Smoke login/registro/recuperacion en web y movil.
- Verificacion de cierre de sesion y expiracion.

### Fase 25: Planes y suscripciones Nómina-Ec

Objetivo: modelar comercialmente la plataforma sin acoplarla a calculos de nomina.

Alcance:

- Crear catalogo inicial de planes: `FREE` o `TRIAL`, `MICRO`, `PYME`, `EMPRESA`, `CORPORATIVO`.
- Definir limites: empleados activos, tenants/empresas, periodos de nomina, documentos, usuarios, soporte, exportaciones bancarias.
- Crear endpoints publicos y admin para planes.
- Agregar RBAC: `planes:ver`, `planes:gestionar`, `pago:iniciar`, `suscripcion:cancelar`.
- Crear estado de suscripcion por tenant y bloqueo operativo no destructivo.

Validaciones:

- Tests de permisos SUPERADMIN/OWNER.
- Tests de limite por plan.
- Migraciones Prisma reversibles.

### Fase 26: PayPhone como canal de pago

Objetivo: integrar PayPhone para checkout de planes y add-ons.

Alcance:

- Variables: `PAYPHONE_TOKEN`, `PAYPHONE_STORE_ID`, `PAYPHONE_BASE_URL`, `PAYPHONE_CONFIRM_URL`, `PAYPHONE_WEBHOOK_SECRET` si aplica, `PAYPHONE_MOCK_MODE`.
- Backend crea checkout intent y firma/valida respuesta sin exponer secretos.
- Manejar centavos, IVA comercial, idempotencia, reintentos y conciliacion.
- Guardar referencias: proveedor, transactionId, clientTransactionId, status, amount, tax, tenantId, userId.
- Crear endpoints de confirmacion/webhook y pantallas de resultado.
- Incluir modo mock solo para desarrollo y bloquearlo en produccion.

Validaciones:

- Tests de payload de montos e IVA.
- Tests de webhook idempotente.
- Smoke sandbox PayPhone con evidencia sin secretos.

### Fase 27: Legal, privacidad, QA y despliegue

Objetivo: cerrar experiencia comercial antes de Render.

Alcance:

- Terminos, privacidad, consentimiento, politica de datos personales y tratamiento de pagos.
- Documentar que PayPhone procesa pago y Nómina-Ec guarda solo referencias no sensibles.
- Agregar runbook Render para variables, redirects, dominios, PWA y webhooks.
- Agregar CI de frontend, movil y backend para auth/pagos.

Validaciones:

- Checklist LOPDP.
- Build web/PWA.
- `expo-doctor`.
- Tests backend de auth/pagos.
- Evidencia de webhook en staging.

## 6. Modelo inicial de planes sugerido

| Plan | Uso objetivo | Limites iniciales | Pago |
| --- | --- | --- | --- |
| TRIAL | Evaluacion | 1 empresa, hasta 10 empleados, 1 periodo de prueba | Sin cobro |
| MICRO | Negocio pequeno | 1 empresa, hasta 25 empleados | PayPhone |
| PYME | Operacion recurrente | 3 empresas, hasta 100 empleados, bancos y reportes | PayPhone |
| EMPRESA | Multiempresa | 10 empresas, hasta 500 empleados, auditoria avanzada | PayPhone / contrato |
| CORPORATIVO | Alto volumen | Limites pactados, soporte prioritario | Contrato |

Los montos no se fijan en este plan. Deben aprobarse comercialmente antes de publicar la landing.

## 7. Riesgos y controles

- RLS Render sigue pendiente; no activar self-service comercial sin aislamiento tenant probado.
- PayPhone requiere pruebas sandbox y validacion de URLs publicas antes de produccion.
- Registro publico puede abrir superficie de abuso; requiere rate limit, captcha o control equivalente y auditoria.
- Recuperacion de password debe usar tokens hasheados, expiracion corta y revocacion de sesiones.
- La PWA no debe cachear datos de nomina, empleados, rol de pagos ni documentos personales.
- El cambio de nombre debe distinguir marca visible de nombres internos historicos para no romper despliegues.

## 8. Comandos planificados

```powershell
cd "C:\proyectos web\nuevo_nomina"
Get-Content -Raw RULES.md
Get-Content -Raw .vscode\AuditLock.json
rg "Plan Haiky|Sistema de RRHH Ecuador|plan-haiky|Plan HAIKY" .
npm run build --prefix frontend-web
npx expo-doctor --prefix app-movil
npm test --prefix backend -- --runInBand
```

## 9. Criterios de cierre

- Producto visible como `Nómina-Ec` en web, PWA, movil y documentos.
- Landing publica instalable como PWA.
- Registro, login y recuperacion funcionan en PWA y app movil.
- Planes se gestionan por SUPERADMIN y se consumen por OWNER.
- PayPhone procesa checkout sin secretos en cliente y con confirmacion auditable.
- AuditLock firmado por fase y commits con `phase: <X>` y `task: <Y.Z>`.
