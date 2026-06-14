# Plan Haiky - Landing, PWA y app stores Nomina-Ec 2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-LANDING-PWA-APP-STORE-NOMINA-EC-2026 |
| Codigo | LPA26 |
| Estado | abierto en fase documental |
| Fase actual | LPA26-00 |
| Alcance | Mejorar landing publica, PWA y app movil de Nomina-Ec sin churn, con foco comercial, cumplimiento LOPDP Ecuador y readiness para Google Play / Apple App Store. |
| Repo objetivo | `SINKRONET-SAS/nomina-ec` |
| Raiz | `C:\proyectos web\nuevo_nomina` |
| Referencia UX/release | `C:\proyectos web\sinkroniq-mobile` |
| RULES | `RULES.md` |
| AuditLock | `.vscode/AuditLock.json` |
| Prompts | `.github/prompts/LANDING-PWA-APP-STORE-NOMINA-EC-2026-{00..08}-*.md` |

## 1. Necesidad

Nomina-Ec ya tiene componentes de producto, pero la landing, la PWA y la app movil deben transmitir confianza inmediata a posibles clientes, reducir friccion comercial y demostrar que el sistema esta listo para operar nomina ecuatoriana con trazabilidad, privacidad y cumplimiento. El objetivo no es rehacer todo: es elevar lo existente con cambios progresivos, medibles y protegidos por fases.

El plan debe evitar churn. Cada fase modifica una superficie concreta, con contrato de salida, validaciones y rollback. No se deben crear landing paralela, app paralela, catalogos paralelos ni textos legales duplicados.

## 2. Referencias revisadas

- `RULES.md`: reglas Haiky no negociables.
- `CODEX_CONTEXT.md`: estado vigente PNE26/HNBE26, bloqueos legales y gobierno de parametrizacion.
- `.vscode/AuditLock.json`: candado actual PNE26 con fase externa bloqueada.
- `.github/prompts/fase-21-landing-publica.prompt.md`: antecedente de landing.
- `.github/prompts/fase-22-pwa-nomina-ec.prompt.md`: antecedente PWA.
- `.github/prompts/fase-24-auth-pwa-mobile.prompt.md`: antecedente auth PWA/mobile.
- `C:\proyectos web\sinkroniq-mobile\docs\GUIA_LAUNCH_ANDROID_IOS_2026.md`: referencia de readiness para tiendas, EAS, metadatos, TestFlight/internal testing y bloqueos externos.
- `C:\proyectos web\sinkroniq-mobile\landing\LOPDP_COMPLIANCE_AUDIT_REPORT.md`: referencia de auditoria LOPDP, consentimiento, cookies, derechos y brechas.
- `C:\proyectos web\sinkroniq-mobile\landing\LOPDP_CRITICAL_GAPS_IMPLEMENTATION.md`: referencia de plan para incidentes, retiro de consentimiento y procesadores.
- `C:\proyectos web\sinkroniq-mobile\scripts\smoke-landing-pwa.js`: patron de smoke de landing/PWA con manifest, service worker y rutas.
- `C:\proyectos web\sinkroniq-mobile\scripts\check-assets-stores-2026.js`: patron de gate para assets mobile/PWA/store.
- `C:\proyectos web\sinkroniq-mobile\assets-generated\meta.json`: referencia de set de assets publicables: icon, adaptive icon, splash, og banner, PWA icons y feature graphic.

## 3. Base legal Ecuador

Fuente oficial revisada:

- Ley Organica de Proteccion de Datos Personales, Registro Oficial Quinto Suplemento No. 459, 26 de mayo de 2021, PDF oficial alojado por MINTEL: https://www.telecomunicaciones.gob.ec/wp-content/uploads/2021/06/Ley-Organica-de-Datos-Personales.pdf

Requisitos de diseno derivados para Nomina-Ec:

- Privacidad por diseno y por defecto en landing, PWA y mobile.
- Aviso de privacidad claro para datos laborales, bancarios, geolocalizacion, documentos, fotos, roles de pago, auditoria y datos de contacto.
- Consentimiento granular y revocable para analitica, cookies no esenciales y comunicaciones comerciales.
- Base legal diferenciada: ejecucion contractual, obligacion legal laboral/tributaria/seguridad social, interes legitimo operativo y consentimiento cuando aplique.
- Derechos del titular: informacion, acceso, rectificacion, eliminacion, oposicion, portabilidad, suspension y no decision automatizada sin control humano cuando aplique.
- Procedimiento de incidentes y notificacion con reloj de 72 horas cuando exista vulneracion relevante.
- Contratos o anexos con encargados/procesadores: hosting, correo, pagos, almacenamiento, analitica, mapas/GPS, notificaciones push, tiendas y proveedores de soporte.
- Minimizar cache de datos personales en service worker y almacenamiento local.
- No usar datos reales de empleados en demos publicas, screenshots de tienda o assets promocionales.

## 4. Principios anti-churn

- Una sola landing: mejorar `frontend-web` salvo decision documentada en fase 01.
- Una sola app movil: extender `app-movil`, no crear workspace nuevo.
- Una sola fuente de marca: assets versionados y referenciados por PWA, mobile, OpenGraph y tiendas.
- Una sola politica legal: paginas publicas y app consumen los mismos textos/versiones legales.
- Sin claims no verificados: no prometer aprobacion SRI/IESS/MDT ni cumplimiento total sin gates legales.
- Cambios pequenos por fase: cada fase deja build verificable y AuditLock firmado.
- Sin copiar textos de facturacion electronica de `sinkroniq-mobile`; solo adaptar patrones de release, assets, PWA, LOPDP y smoke tests.

## 5. Propuesta de valor comercial

Mensaje central:

> Nomina-Ec ayuda a empresas ecuatorianas a operar nomina, asistencia, roles de pago, archivos bancarios, RDEP/IESS y documentos laborales con trazabilidad, parametrizacion legal y privacidad desde el primer dia.

Publicos prioritarios:

- Empresas de 5 a 200 empleados que hoy usan hojas de calculo.
- Outsourcing contable o RRHH que administra varias empresas.
- Empresas con marcacion movil, sedes o trabajo en campo.
- Owners que necesitan roles, bancos y reportes sin depender de procesos manuales.

Interes comercial esperado:

- Hero claro con beneficio operacional, no hero generico.
- CTA principal: iniciar prueba / registrar empresa.
- CTA secundario: ver checklist de cumplimiento / solicitar demo.
- Evidencia visible: ciclo de nomina, trazabilidad, proteccion de datos, banco, RDEP/IESS y parametrizacion.
- Calculadora simple de riesgo/tiempo: horas ahorradas por mes y errores evitados.
- Screenshots reales o generados desde entorno demo, sin datos personales.

## 6. Fases

### LPA26-00 - Baseline documental y candado

Objetivo: abrir el plan, prompts, contexto y AuditLock sin tocar runtime.

Entregables:

- Plan `docs2/PLAN_HAIKY_LANDING_PWA_APP_STORE_NOMINA_EC_2026.md`.
- Prompts `.github/prompts/LANDING-PWA-APP-STORE-NOMINA-EC-2026-00..08`.
- `CODEX_CONTEXT.md` actualizado con el plan abierto.
- `.vscode/AuditLock.json` actualizado y firmado.

Validaciones:

- `RULES.md` leido.
- AuditLock anterior hasheado.
- Referencia `sinkroniq-mobile` leida solo como patron, no como fuente de copia funcional.

### LPA26-01 - Diagnostico anti-churn de landing/PWA/app

Objetivo: mapear estado real antes de modificar.

Tareas:

- Inventariar rutas publicas, privadas, PWA manifest, service worker, assets, app config y Expo.
- Identificar duplicados o superficies paralelas.
- Comparar con patrones de `sinkroniq-mobile`: smoke PWA, assets de tienda, guia de lanzamiento, privacidad.
- Definir backlog cerrado por prioridad P0/P1/P2.

Salida:

- Reporte `docs2/landing-pwa-app-store-2026/REPORTE_LPA26_01_DIAGNOSTICO.md`.
- Lista de archivos que se pueden tocar sin churn.

### LPA26-02 - Mensaje comercial y landing de conversion

Objetivo: mejorar la landing para generar interes y confianza.

Tareas:

- Reescribir propuesta de valor con foco en nomina Ecuador.
- Mostrar flujo operativo: empleados, novedades, roles, cierre, bancos, RDEP/IESS, auditoria.
- Agregar CTA a registro, demo y privacidad.
- Agregar prueba social preparada para futuro sin inventar clientes.
- Mantener accesibilidad, responsive y textos en espanol tecnico.

Gates:

- Build web.
- Revision visual desktop/mobile.
- No se introducen claims legales absolutos.

### LPA26-03 - PWA instalable y segura

Objetivo: que la PWA sea instalable, coherente con marca y segura para datos laborales.

Tareas:

- Validar manifest `es-EC`, icons maskable, screenshots, shortcuts.
- Configurar service worker para no cachear API ni datos personales.
- Crear smoke similar a `smoke-landing-pwa.js` adaptado a Nomina-Ec.
- Validar offline shell sin exponer empleados, roles, cuentas bancarias o geolocalizacion.

Gates:

- `npm.cmd run build` en frontend.
- Manifest existe y referencia assets reales.
- Service worker excluye `/api`.

### LPA26-04 - App movil lista para stores

Objetivo: preparar `app-movil` para Google Play y Apple App Store.

Tareas:

- Revisar `app.json` / `app.config` / EAS si existe.
- Definir `android.package` y `ios.bundleIdentifier` finales.
- Completar iconos, adaptive icon, splash, notification icon, screenshots y feature graphic.
- Documentar metadatos de tienda: nombre, descripcion corta/larga, categorias, privacidad, soporte, marketing URL.
- Preparar internal testing Android y TestFlight iOS.

Bloqueos externos:

- Cuentas Play Console y Apple Developer.
- App Store Connect `ascAppId` y `appleTeamId`.
- Certificados/perfiles si no se usa EAS gestionado.

Gates:

- `expo-doctor`.
- Checklist store assets.
- Build Android `app-bundle` documentado.

### LPA26-05 - LOPDP y privacidad operacional

Objetivo: cumplir la legislacion ecuatoriana de proteccion de datos para landing, PWA y app.

Tareas:

- Politica de privacidad versionada para datos laborales, bancarios, geolocalizacion, fotos, documentos y auditoria.
- Terminos de servicio versionados.
- Consentimiento de cookies y analitica no esencial.
- Consentimiento LOPDP y registro de fecha/version.
- UI o flujo documentado para retirar consentimiento.
- Procedimiento de incidentes y notificacion.
- Inventario de encargados/procesadores y DPA.
- Matriz de retencion y eliminacion.

Gates:

- No se activa analitica sin consentimiento.
- No se cachean datos personales.
- No se usan datos reales en screenshots.
- Evidencia documental LOPDP actualizada.

### LPA26-06 - Registro, activacion y onboarding comercial

Objetivo: convertir interes en empresas activadas sin friccion innecesaria.

Tareas:

- Flujo de registro claro para OWNER.
- Verificacion de correo.
- Onboarding de empresa: datos, banco, usuarios, parametros minimos.
- Demo/sandbox con datos ficticios.
- Estados de plan y trial comprensibles.

Gates:

- Smoke registro/login/recuperacion.
- No hay fallos silenciosos.
- Eventos de auditoria con `correlationId`.

### LPA26-07 - QA visual, performance y confianza

Objetivo: cerrar calidad antes de publicacion.

Tareas:

- Smoke visual desktop/mobile.
- Pruebas PWA instalable.
- Lighthouse o equivalente: performance, accesibilidad, buenas practicas.
- Verificacion copy legal/comercial.
- Pruebas de errores: plan vencido, email no verificado, tenant suspendido.

Gates:

- Reporte QA con evidencias.
- Lista residual P0 vacia.
- P1 aceptado por owner.

### LPA26-08 - Release stores y go-live

Objetivo: dejar la app lista para subir y operar en canales publicos.

Tareas:

- Guia de lanzamiento Android/iOS para Nomina-Ec.
- Checklist Play Console y App Store Connect.
- Internal testing / TestFlight.
- URLs publicas: soporte, privacidad, terminos, marketing, eliminacion de cuenta.
- Runbook de rollback y hotfix.

Gates:

- Build store generado o bloqueo externo documentado.
- Metadata lista.
- Politicas legales accesibles publicamente.
- AuditLock firmado.

## 7. Prompts esperados

Cada prompt debe:

- Empezar con `Actua bajo RULES.md`.
- Validar AuditLock de la fase anterior.
- Respetar orden estricto.
- Evitar churn y cambios fuera de alcance.
- Exigir validaciones y firma AuditLock al cierre.
- Usar commits con `phase: LPA26-XX task: ...`.

## 8. Matriz de riesgos

| Riesgo | Impacto | Mitigacion |
|--------|---------|------------|
| Rehacer landing completa sin necesidad | Churn alto | Diagnostico LPA26-01 y cambios por seccion |
| Prometer cumplimiento legal absoluto | Riesgo legal | Claims con lenguaje prudente y gates profesionales |
| Cachear datos sensibles en PWA | Riesgo LOPDP | SW excluye API y datos privados |
| Screenshots con datos reales | Riesgo LOPDP | Dataset demo ficticio obligatorio |
| App no aceptada en tiendas | Retraso comercial | Checklist store, metadata, privacy URLs y TestFlight/internal testing |
| Duplicar politicas legales | Inconsistencia | Fuente unica versionada |
| Analitica sin consentimiento | Incumplimiento | Consent gate obligatorio |

## 9. Definicion de listo

La linea LPA26 se considera lista cuando:

- Landing publica genera interes y explica Nomina-Ec en menos de 10 segundos.
- PWA instala correctamente y no expone datos sensibles offline.
- App movil tiene package/bundle, assets, metadata y checklist de tiendas.
- Existen politicas LOPDP, terminos, cookies, retiro de consentimiento e incident response.
- Hay smoke tests para landing/PWA/app.
- AuditLock esta firmado para la fase ejecutada.
- Bloqueos externos de tiendas quedan documentados con responsable y evidencia.

