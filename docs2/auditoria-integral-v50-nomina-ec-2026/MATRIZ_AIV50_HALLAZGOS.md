# Matriz AIV50 - Auditoria Integral V50 Nomina-Ec 2026

| ID | Severidad | Capa | Hallazgo | Evidencia V50 | Accion Haiky |
|----|-----------|------|----------|---------------|--------------|
| BKD-C01 | Critica | Backend | N+1 en `calculoNominaService.js`: `getLegalParametersForTenant()` se carga dentro del loop de empleados. | Auditoria V50 confirma patron `for...of empleados` + `calcularEmpleado()` recargando parametros por empleado. | Precargar parametros por tenant/anio antes del loop, pasar a `calcularEmpleado`, test de regresion con mock/contador de llamadas. |
| BKD-C02 | Critica | Backend/Auth | `/login` y `/forgot-password` sin rate limiting; login usa `SELECT *`. | V50 reporta ausencia de rate limit y query amplia sobre `usuarios`. | Middleware rate limit, query por columnas, auditoria de intentos, anti-enumeracion y pruebas. |
| BKD-C03 | Critica | Backend/Mobile API | `fotoBase64` aceptada sin validar tamano/formato. | V50 detecta paso directo desde `req.body` a validacion/servicio. | Validar base64, MIME, limite 2MB configurable, error con correlationId y UI movil clara. |
| LEG-C01 | Critica | Legal Ecuador | Doble fuente de parametros legales (`parametros_legales` y `legal_parameter_versions`). | V50 advierte riesgo de tasas IESS divergentes y calculo incorrecto. | Definir fuente primaria, migracion/compatibilidad, warnings estructurados, tests IESS 2026 y bloqueo profesional si falta fuente. |
| MOB-C01 | Critica | App movil | `MarcacionScreen` no verifica permisos GPS al cargar. | V50 senala riesgo de pedir ubicacion tarde o fallar sin mensaje claro. | Solicitar/verificar permisos al inicializar, fail-closed, estado visible y reintento. |
| MOB-C02 | Alta | App movil | UI insuficiente para marcacion fuera de zona. | V50 propone distancia en metros y estado diferenciado. | Mostrar distancia, precision, zona esperada, accion siguiente y log seguro. |
| LEG-H01 | Alta | Legal/Backend/Frontend | Registro/invitacion sin consentimiento LOPDP suficiente para datos laborales. | V50 diferencia auditoria de comunicaciones vs consentimiento de tratamiento. | Tabla/registro de consentimientos versionados, checkbox UI, evidencia por finalidad. |
| LEG-M01 | Media | Legal/Mobile | Foto de marcacion puede ser dato biometrico sensible. | V50 indica necesidad de consentimiento separado y retencion. | Politica de foto: no guardar o cifrar/retener con consentimiento biometrico separado. |
| PWA-C01 | Critica | Frontend/PWA | `Dashboard.jsx` grande y con responsabilidades mezcladas. | V50 lo marca como refactor de estabilidad. | Extraer hooks/utils/componentes sin cambiar contrato visual; build y smoke. |
| PWA-H02 | Alta | Frontend/PWA | Falta ruta 404 catch-all. | V50 la prioriza como fix rapido de navegacion. | Agregar `NotFound`, ruta catch-all y prueba/smoke de navegacion. |
| PWA-M01 | Media | Frontend/PWA | Interceptor 401 insuficiente o ausente. | V50 lo ubica como mejora de sesion. | Redirigir a login, limpiar sesion y mostrar mensaje humanizado. |
| BKD-H02 | Alta | Backend | `app.js` concentra rutas y middleware. | V50 confirma `backend/src/routes` casi vacio y app monolitica. | Refactor gradual por dominio, sin cambiar paths publicos, tests de smoke. |
| BKD-M01 | Media | Backend | `communicationService.js` mezcla SMTP, plantillas, auditoria y retry. | V50 lo describe como God Service residual. | Extraer plantillas/transporte solo con tests y compatibilidad. |
| DUP-H01 | Alta | Backend | Paginacion/filtros/auditoria duplicados en servicios. | V50 detecta patrones repetidos en `configurationService` y otros. | Crear helper `queryBuilder` o equivalente seguro con parametros, migrar casos de bajo riesgo. |
| DUP-M01 | Media | Backend/Mobile | Validacion de identidad Ecuador duplicada o dispersa. | V50 propone `ecuadorIdentityValidator`. | Centralizar validador y cubrir cedula/RUC con tests. |
| ELIM-01 | Baja | Mobile | `AutoservicioScreen.js` huerfana. | V50 indica no registrada en navigator. | Verificar roadmap/imports: registrar si se requiere o eliminar con evidencia. |
| ELIM-02 | Nula | Backend tests | `integrationController.test.js` fuera de directorio de test. | V50 propone mover a `backend/test/`. | Confirmar config Jest y mover con `git mv` si procede. |
| ELIM-03 | Nula | Backend tests | `bancoAebGenerator.test.js` fuera de directorio de test. | V50 propone mover a `backend/test/`. | Confirmar config Jest y mover con `git mv` si procede. |

## Criterio de cierre definitivo

AIV50 se considera cerrado solo si los P0 tienen tests o gates reproducibles, los cambios con impacto usuario son visibles en PWA/app movil, los candidatos a eliminacion quedan respaldados por busqueda de imports/rutas y el `AuditLock` registra cada fase con firma valida.
## Cierre local 2026-06-21

- N+1 nomina cerrado con prueba `calculoNominaService.batch.test.js`.
- Auth/rate/foto cerrado con rutas modulares y validacion `validateFotoBase64`.
- Legal cerrado con deteccion de divergencia entre fuentes.
- Mobile GPS cerrado con fail-closed al cargar.
- Frontend PWA cerrado con 404, interceptor 401 y controles visibles.
- `AutoservicioScreen.js` conservado por uso real en `app-movil/src/App.js`.
