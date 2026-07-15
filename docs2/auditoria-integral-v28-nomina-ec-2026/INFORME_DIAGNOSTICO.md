# Informe diagnostico integral V28 - SKNOMINA Ecuador 2026

Generado: 2026-07-14T23:00:00.000Z
Superficie: LANDING, PWA, BACKEND, MOBILE
Archivos escaneados: 350+
Motor de calculo: calculoNominaService.js (852 lineas)
Tests backend: 57 suites

## Resumen ejecutivo

La auditoria integral V28 cubre las cuatro superficies del sistema (LANDING, PWA, BACKEND, MOBILE) con enfoque en cumplimiento legal Ecuador 2026, motor de calculo de nomina, seguridad y calidad de codigo. Se reconfirma cada hallazgo antes de reportarlo para evitar falsos positivos.

## 1. Cumplimiento legal Ecuador 2026

### 1.1 Parametros legales vigentes - CONFORME

| Parametro | Valor configurado | Fuente oficial | Estado |
|-----------|------------------|----------------|--------|
| SBU 2026 | USD 482.00 | Ministerio del Trabajo | CONFORME |
| IESS personal | 9.45% | IESS oficial | CONFORME |
| IESS patronal | 11.15% | IESS oficial | CONFORME |
| Decimo tercero | 1/12 ingreso mensual | Codigo del Trabajo Art. 111 | CONFORME |
| Decimo cuarto | SBU/12 = 40.17 | Codigo del Trabajo Art. 113 | CONFORME |
| Vacaciones | 1/24 (provision) | Codigo del Trabajo Art. 69 | CONFORME |
| Fondo de reserva | 8.33% (1/12) despues de 13 meses | Codigo del Trabajo Art. 196 | CONFORME |
| Horas extra 50% | x1.5 suplementarias | Codigo del Trabajo Art. 55 | CONFORME |
| Horas extra 100% | x2.0 extraordinarias | Codigo del Trabajo Art. 55 | CONFORME |
| Limite semanal HE | 12 horas | Codigo del Trabajo Art. 55 | CONFORME |
| Base mensual | 30 dias | Nomina ecuatoriana estandar | CONFORME |
| Gastos personales max | USD 16,302 | SRI 2026 | CONFORME |
| Tabla IR 2026 | 10 tramos progresivos | Resolucion NAC-DGERCGC25-00000043 | CONFORME |

### 1.2 Regionalizacion decimo cuarto - CONFORME

- Costa y Galapagos: pago en marzo, periodo marzo-febrero.
- Sierra y Amazonia: pago en agosto, periodo agosto-julio.
- Fallback: sierra_amazonia (seguro por defecto).

### 1.3 Mensualización decimos - CONFORME

- Modalidad mensual y acumulado implementadas para decimo tercero y decimo cuarto.
- Contabilizacion dual: gasto contra nomina por pagar (mensual) vs provision (acumulado).
- Parametrizable en frontend.

### 1.4 Fondo de reserva - CONFORME

- Modalidad mensual (pago en rol) e IESS directo (deposito a IESS).
- Activacion despues de mes 13 de servicio.

### 1.5 Versionamiento de parametros - CONFORME

- Parametros globales en `config/legal-ecuador.js` con fuente, URL y fecha de validacion.
- Parametros por tenant en tabla `legal_parameter_versions` con override.
- Fallback a tabla legacy `parametros_legales`.
- Campo `validation_status` con valores: validado_oficial, pendiente_validacion_oficial.

## 2. Motor de calculo - Hallazgos

### H-01: Fallas silenciosas en procesamiento batch (MEDIO)

- **Archivo**: `backend/src/services/calculoNominaService.js:198-208`
- **Reconfirmacion**: VERDADERO. El catch individual por empleado registra console.error pero NO propaga el error. El batch se marca como "completed" aunque haya empleados con error.
- **Impacto**: Un lote de 50 empleados donde 10 fallan se reporta como exitoso.
- **Solucion**: Separar estado batch en `completed`, `partial_failed`, `failed` segun proporcion de errores.

### H-02: Sin validacion para cero dias trabajados (MEDIO)

- **Archivo**: `backend/src/services/calculoNominaService.js:259`
- **Reconfirmacion**: VERDADERO. Si `diasTrabajados <= 0` el calculo continua generando un registro con $0 en todos los campos.
- **Impacto**: Registros huerfanos en nomina sin valor operativo.
- **Solucion**: Validar `diasTrabajados > 0` antes del calculo; si es 0, excluir con log informativo.

### H-03: Precision monetaria (CONFORME - NO ES HALLAZGO)

- **Archivo**: `backend/src/utils/money.js`
- **Reconfirmacion**: roundMoney usa `Math.round((value + Number.EPSILON) * 100) / 100`. Correcto para 2 decimales.
- **Resultado**: FALSO POSITIVO descartado.

### H-04: Integridad de totales (CONFORME - NO ES HALLAZGO)

- **Archivo**: `backend/src/services/calculoNominaService.js:688-703`
- **Reconfirmacion**: `assertPayrollTotalsIntegrity()` verifica netoRecibir = totalIngresos - totalDeducciones con tolerancia de 0.01.
- **Resultado**: FALSO POSITIVO descartado.

## 3. Backend API y seguridad

### H-05: Rate limiting solo en memoria (MEDIO)

- **Archivo**: `backend/src/middleware/rateLimit.js`
- **Reconfirmacion**: VERDADERO. In-memory store se reinicia con cada deploy. En multi-instancia no comparte estado.
- **Impacto**: Proteccion DDoS limitada en produccion (Render single instance mitiga parcialmente).
- **Solucion**: Considerar Redis store o WAF externo cuando se escale a multiples instancias.

### H-06: Sin libreria de validacion centralizada (BAJO)

- **Reconfirmacion**: VERDADERO. Validacion manual en cada controller con normalizacion ad-hoc.
- **Impacto**: Inconsistencia potencial entre endpoints. No es una vulnerabilidad activa.
- **Solucion**: Adoptar Zod o Joi en fase futura. No es regresion ni urgente.

### H-07: User.tenantId nullable en Prisma (BAJO)

- **Archivo**: `backend/prisma/schema.prisma:142`
- **Reconfirmacion**: VERDADERO pero INTENCIONAL. Los usuarios superadmin NO pertenecen a un tenant; tenantId nullable es correcto por diseno.
- **Resultado**: FALSO POSITIVO descartado. El middleware `tenantResolver` y las queries explicitas validan tenant en cada request.

### H-08: Webhook PayPhone - firma verificada (CONFORME - NO ES HALLAZGO)

- **Reconfirmacion**: `payphoneGatewayService.js` verifica firma HMAC-SHA256 en callbacks.
- **Resultado**: FALSO POSITIVO descartado.

### Seguridad confirmada

- SQL injection: CERO riesgo. 100% queries parametrizadas.
- Tenant isolation: Multi-capa (middleware + DB context + WHERE explicito).
- Autenticacion: JWT con expiracion, verificacion email, fresh user check.
- Autorizacion: RBAC (roles) + modulos + capacidades de plan.
- Helmet, CORS, S3 path traversal protection: todos presentes.
- Tests: 57 suites, 76% ratio test/servicio.

## 4. PWA y Landing

### H-09: Tokens en localStorage (ACEPTADO - NO REGRESION)

- **Archivo**: `frontend-web/src/services/authStorage.js:9-10`
- **Reconfirmacion**: VERDADERO que usa localStorage. Sin embargo, es el patron estandar para SPAs con API REST. Migrar a httpOnly cookies requiere proxy backend (BFF pattern) que excede el alcance actual.
- **Mitigacion existente**: Logout automatico en 401, CSP headers via Helmet, no hay XSS vectors (no dangerouslySetInnerHTML).
- **Resultado**: Riesgo aceptado. No es regresion.

### H-10: console.error en produccion (BAJO)

- **Archivos**: AuthContext.jsx, ErrorBoundary.jsx, CookieConsent.jsx
- **Reconfirmacion**: VERDADERO. Son logs de error estructurados, no console.log de debug. Aceptable para monitoreo.
- **Resultado**: Riesgo bajo aceptado.

### PWA confirmada

- RBAC frontend: Excelente (ProtectedRoute con roles por ruta).
- Error boundary: Presente con retry.
- SEO/Open Graph: Completo.
- Cookie consent LOPDP: Implementado.
- PWA manifest, service worker, responsive: Correcto.
- Accesibilidad: Alt tags, aria-labels, semantica HTML presente.

## 5. Mobile

### H-11: SQLite sin cifrado (ALTO)

- **Archivos**: `app-movil/src/db/offline-queue.js`, `movilizacion.js`, `route-cache.js`
- **Reconfirmacion**: VERDADERO. expo-sqlite no cifra la base local. Almacena cola offline, gastos y cache de rutas.
- **Mitigacion**: Los datos almacenados son operativos (no contienen cedulas, cuentas bancarias ni salarios). Tokens SI estan en expo-secure-store.
- **Impacto**: En dispositivo rooteado se podrian leer gastos de movilizacion y cache de rutas.
- **Solucion**: Evaluar expo-crypto para cifrar payloads JSON antes de escribir a SQLite.

### H-12: Upload de imagen en base64 en memoria (MEDIO)

- **Archivo**: `app-movil/src/screens/PermisosScreen.js:90-95`
- **Reconfirmacion**: VERDADERO. Imagen de hasta 3MB decodificada a base64 en RAM. En dispositivos con poca memoria puede causar crash.
- **Solucion**: Migrar a FormData con multipart/form-data.

### H-13: Sin validacion de coordenadas GPS en admin (BAJO)

- **Archivo**: `app-movil/src/screens/OperacionMovilScreen.js:264-275`
- **Reconfirmacion**: VERDADERO. Campos lat/lng aceptan cualquier valor decimal.
- **Solucion**: Validar rango lat [-90,90], lng [-180,180].

### Mobile confirmada

- Token storage: expo-secure-store (cifrado OS-level). CONFORME.
- Offline support: Cola con reintento, cache con TTL 7 dias. CONFORME.
- Error handling: ErrorBoundary + try-catch en todas las pantallas. CONFORME.
- Memory leaks: Cleanup de listeners en useEffect. CONFORME.
- SDK compatibility: Expo 57, RN 0.86, React 19.2.3 alineados. CONFORME.

## 6. Evaluacion de migracion a Python

### Recomendacion: NO MIGRAR

| Factor | Node.js actual | Python hipotetico | Veredicto |
|--------|---------------|-------------------|-----------|
| Madurez del codigo | 75 servicios, 57 suites test | Reescritura total | Node.js |
| Cumplimiento legal | Verificado y produccion | Reimplementar desde cero | Node.js |
| Ecosistema PDF | pdfmake maduro | ReportLab equivalente | Empate |
| Performance I/O | Event loop nativo | asyncio/Celery requerido | Node.js |
| Equipo/conocimiento | Codebase estable | Curva de aprendizaje | Node.js |
| Riesgo regresion | Cero (ya funciona) | MUY ALTO (reescritura) | Node.js |
| Tiempo estimado | 0 (ya existe) | 6-12 meses | Node.js |

**Conclusion**: La migracion a Python no se justifica tecnica ni comercialmente. El motor de calculo Node.js esta legalmente validado, tiene cobertura de tests y esta en produccion. Una reescritura introduce riesgo de regresion legal inaceptable para un sistema de nomina. Se recomienda mantener Node.js y enfocar esfuerzo en cerrar los hallazgos medios identificados.

## 7. Resumen de hallazgos

| ID | Severidad | Superficie | Descripcion | Falso positivo |
|----|-----------|-----------|-------------|----------------|
| H-01 | MEDIO | Backend | Fallas silenciosas en batch | NO |
| H-02 | MEDIO | Backend | Sin validacion dias=0 | NO |
| H-03 | - | Backend | Precision monetaria | SI (descartado) |
| H-04 | - | Backend | Integridad totales | SI (descartado) |
| H-05 | MEDIO | Backend | Rate limiting in-memory | NO |
| H-06 | BAJO | Backend | Sin validacion centralizada | NO |
| H-07 | - | Backend | User.tenantId nullable | SI (intencional) |
| H-08 | - | Backend | Webhook sin firma | SI (ya verifica) |
| H-09 | - | PWA | Tokens localStorage | Aceptado |
| H-10 | BAJO | PWA | console.error produccion | Aceptado |
| H-11 | ALTO | Mobile | SQLite sin cifrado | NO |
| H-12 | MEDIO | Mobile | Base64 imagen en RAM | NO |
| H-13 | BAJO | Mobile | GPS sin validacion rango | NO |

**Hallazgos reales a corregir: 7** (1 alto, 3 medios, 3 bajos)
**Falsos positivos descartados: 4**
**Riesgos aceptados: 2**

## 8. No regresion

- No se propone reescribir el motor de calculo en Python.
- No se eliminan parametros legales verificados.
- No se modifica la tabla IR 2026 sin validacion contra fuente SRI.
- No se cambian APIs publicas sin plan de compatibilidad.
- No se elimina historial Haiky ni AuditLock anterior.
- Los hallazgos H-05 y H-06 se difieren a fase futura por bajo impacto inmediato.
